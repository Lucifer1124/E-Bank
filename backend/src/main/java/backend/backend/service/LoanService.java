package backend.backend.service;

import backend.backend.model.BankAccount;
import backend.backend.model.LoanApplication;
import backend.backend.model.LoanEligibilityRequest;
import backend.backend.model.LoanRepayment;
import backend.backend.model.RepaymentPlanType;
import backend.backend.model.Transaction;
import backend.backend.model.User;
import backend.backend.repository.BankAccountRepository;
import backend.backend.repository.LoanApplicationRepository;
import backend.backend.repository.LoanEligibilityRequestRepository;
import backend.backend.repository.LoanRepaymentRepository;
import backend.backend.repository.TransactionRepository;
import backend.backend.repository.UserRepository;
import backend.backend.requests.LoanPlanSelectionRequest;
import backend.backend.requests.LoanSummaryResponse;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class LoanService {

    @Autowired
    private LoanEligibilityRequestRepository eligibilityRepo;
    @Autowired
    private LoanApplicationRepository applicationRepo;
    @Autowired
    private BankAccountRepository bankRepo;
    @Autowired
    private RestTemplate restTemplate;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TransactionRepository txRepo;
    @Autowired
    private LoanRepaymentRepository repaymentRepo;
    @Autowired
    private BankService bankService;

    @Value("${loan.check.url}")
    private String loanCheckUrl;

    @Value("${loan.credit-score.minimum:300}")
    private double minimumCreditScore;

    // Check loan eligibility using ML and enforce the business salary cap.
    public LoanEligibilityRequest checkEligibility(String username, double income, String pan, String adhar, double creditScore, double requestedAmount) {
        validateEligibilityInput(income, creditScore, requestedAmount, pan, adhar);

        LoanEligibilityRequest req = new LoanEligibilityRequest();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        BankAccount bank = bankRepo.findByUserUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Bank account not found"));

        bank = syncKycAndValidate(bank, pan, adhar);

        double balance = bank.getBalance();
        double avgAmount = txRepo.findByUserId(user.getId().intValue())
                .stream()
                .mapToDouble(Transaction::getAmount)
                .average()
                .orElse(0.0);
        double salaryCap = Math.max(0, income * 10);

        req.setUser(user);
        req.setUsername(username);
        req.setIncome(income);
        req.setPan(normalizePan(pan));
        req.setAdhar(normalizeAdhar(adhar));
        req.setCreditScore(creditScore);
        req.setRequestedAmount(requestedAmount);

        req.setBalance(balance);
        req.setAvg_transaction(avgAmount);
        req.setMaxAmount(salaryCap);

        Map<String, Object> payload = Map.of(
                "income", income,
                "pan", normalizePan(pan),
                "adhar", normalizeAdhar(adhar),
                "credit_score", creditScore,
                "requested_amount", requestedAmount,
                "balance", balance,
                "avg_transaction", avgAmount
        );

        boolean withinSalaryCap = requestedAmount <= salaryCap;
        boolean passesCreditScore = creditScore >= minimumCreditScore;
        double probability = fetchAdvisoryProbability(payload, creditScore, requestedAmount, salaryCap);
        req.setEligible(withinSalaryCap && passesCreditScore);
        req.setProbability(probability);

        return eligibilityRepo.save(req);
    }

    // User applies for loan after passing the eligibility gate.
    public LoanApplication applyLoan(Long eligibilityId, String usernameFromToken) {
        LoanEligibilityRequest eligibility = eligibilityRepo.findById(eligibilityId)
                .orElseThrow(() -> new RuntimeException("Eligibility not found"));

        if (!eligibility.getUsername().equals(usernameFromToken)) {
            throw new RuntimeException("Unauthorized to apply for this loan");
        }

        if (!eligibility.isEligible()) {
            throw new RuntimeException("User not eligible for this loan");
        }

        if (eligibility.getRequestedAmount() > eligibility.getMaxAmount()) {
            throw new RuntimeException("Requested amount exceeds the allowed 10x monthly salary cap");
        }

        boolean hasActiveLoan = applicationRepo.findAccessibleByUsername(eligibility.getUsername())
                .stream()
                .anyMatch(this::isActiveLoan);

        if (hasActiveLoan) {
            throw new RuntimeException("You already have an active loan. Repay it before applying again.");
        }

        LoanApplication loan = new LoanApplication();
        loan.setUser(userRepository.findByUsername(eligibility.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found")));
        loan.setUsername(eligibility.getUsername());
        loan.setAmount(eligibility.getRequestedAmount());
        loan.setMonthlyIncome(eligibility.getIncome());
        loan.setStatus("PENDING");
        loan.setApproved(false);
        return applicationRepo.save(loan);
    }

    // Admin approves loan and credits the user's account.
    @Transactional
    public LoanApplication approveLoan(Long loanId) {
        LoanApplication loan = applicationRepo.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));

        if (loan.isApproved() || "APPROVED".equalsIgnoreCase(loan.getStatus())) {
            throw new RuntimeException("Loan already approved");
        }

        loan.setApproved(true);
        loan.setStatus("APPROVED");
        loan.setApprovedAt(LocalDateTime.now());
        applicationRepo.save(loan);

        BankAccount account = bankRepo.findByUserUsername(loan.getUsername())
                .orElseThrow(() -> new RuntimeException("Bank account not found"));
        account.setBalance(account.getBalance() + loan.getAmount());
        bankRepo.save(account);

        Transaction tx = new Transaction();
        tx.setSenderAccount("BANK");
        tx.setReceiverAccount(account.getAccountNumber());
        tx.setAmount(loan.getAmount());
        tx.setBalance(account.getBalance());
        tx.setTimestamp(LocalDateTime.now());
        tx.setFraud_probability(0);
        tx.setIs_fraud(0);
        tx.setUserId(account.getUser().getId().intValue());
        tx.setAvg_amount(getAverageTransactionAmount(account.getUser().getId().intValue(), loan.getAmount()));
        tx.setIsHighRisk(0);
        tx.setIsForeign(0);
        txRepo.save(tx);

        return loan;
    }

    public List<LoanApplication> getPendingLoans() {
        return applicationRepo.findAll()
                .stream()
                .filter(a -> !a.isApproved() && !"REJECTED".equals(normalizedStatus(a.getStatus())))
                .toList();
    }

    public List<LoanSummaryResponse> getApprovedLoanSummaries(String username) {
        return applicationRepo.findAccessibleByUsername(username)
                .stream()
                .filter(this::isApprovedOrClosedLoan)
                .sorted(Comparator.comparing(LoanApplication::getId).reversed())
                .map(this::buildLoanSummary)
                .toList();
    }

    @Transactional
    public LoanSummaryResponse configureRepaymentPlan(Long loanId, String username, LoanPlanSelectionRequest body) {
        LoanApplication loan = getOwnedLoan(loanId, username);

        if (!loan.isApproved()) {
            throw new RuntimeException("Loan is not approved yet");
        }

        if ("PAID".equalsIgnoreCase(loan.getStatus())) {
            throw new RuntimeException("Loan is already closed");
        }

        boolean hasPaymentHistory = repaymentRepo.findByLoanIdOrderByPaymentDateDesc(loanId)
                .stream()
                .anyMatch(r -> "PAYMENT".equalsIgnoreCase(r.getEntryType()) && r.getAmountPaid() > 0);
        if (hasPaymentHistory) {
            throw new RuntimeException("Repayment plan cannot be changed after payments have started");
        }

        RepaymentPlanType planType = RepaymentPlanType.from(body.getPlanType());
        Integer tenureMonths = switch (planType) {
            case MONTHLY_EMI_3 -> validateTenure(body.getTenure(), 1, 120, "months");
            case YEARLY_15 -> validateTenure(body.getTenure(), 1, 30, "years") * 12;
            case FLEXIBLE_10 -> null;
        };

        loan.setRepaymentPlanType(planType.name());
        loan.setInterestRate(planType.getInterestRate());
        loan.setTenureMonths(tenureMonths);
        applicationRepo.save(loan);

        LoanSummaryResponse summary = buildLoanSummary(loan);
        upsertPlanSetupEntry(loan, summary);
        return summary;
    }

    @Transactional
    public LoanRepayment repayLoan(Long loanId, double amount, String username) {
        LoanApplication loan = getOwnedLoan(loanId, username);

        if (!loan.isApproved()) {
            throw new RuntimeException("Loan not approved yet");
        }

        if (RepaymentPlanType.fromNullable(loan.getRepaymentPlanType()) == null) {
            throw new RuntimeException("Please select a repayment plan before making payments");
        }

        if (amount <= 0) {
            throw new IllegalStateException("Amount cannot be zero or negative");
        }

        LoanSummaryResponse summaryBefore = buildLoanSummary(loan);
        double remaining = summaryBefore.getRemainingBalance();
        if (amount > remaining) {
            throw new RuntimeException("Repayment exceeds remaining balance. You can only pay Rs " + remaining);
        }

        BankAccount account = bankRepo.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Bank account not found"));
        if (account.getBalance() < amount) {
            throw new RuntimeException("Insufficient balance");
        }

        account.setBalance(account.getBalance() - amount);
        bankRepo.save(account);

        Transaction tx = new Transaction();
        tx.setSenderAccount(account.getAccountNumber());
        tx.setReceiverAccount("BANK");
        tx.setAmount(amount);
        tx.setBalance(account.getBalance());
        tx.setTimestamp(LocalDateTime.now());
        tx.setFraud_probability(0);
        tx.setIs_fraud(0);
        tx.setUserId(account.getUser().getId().intValue());
        tx.setAvg_amount(getAverageTransactionAmount(account.getUser().getId().intValue(), amount));
        tx.setIsHighRisk(0);
        tx.setIsForeign(0);
        txRepo.save(tx);

        double interestOutstanding = summaryBefore.getInterestRemaining();
        double interestComponent = Math.min(amount, interestOutstanding);
        double principalComponent = amount - interestComponent;

        LoanRepayment repayment = new LoanRepayment();
        repayment.setLoanId(loanId);
        repayment.setUser(loan.getUser());
        repayment.setUsername(loan.getUsername());
        repayment.setEntryType("PAYMENT");
        repayment.setAmountPaid(amount);
        repayment.setPrincipalComponent(principalComponent);
        repayment.setInterestComponent(interestComponent);
        repayment.setBalanceBeforePayment(remaining);
        repayment.setPaymentDate(LocalDateTime.now());
        repayment.setRemainingBalance(remaining - amount);
        repayment.setTotalPaidAfterPayment(summaryBefore.getTotalPaid() + amount);
        LoanRepayment savedRepayment = repaymentRepo.save(repayment);

        if (remaining - amount <= 0.0001) {
            loan.setStatus("PAID");
            applicationRepo.save(loan);
        }

        return savedRepayment;
    }

    private LoanApplication getOwnedLoan(Long loanId, String username) {
        LoanApplication loan = applicationRepo.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));

        if (!loan.getUsername().equals(username)) {
            if (loan.getUser() != null && username.equals(loan.getUser().getUsername())) {
                return loan;
            }
            throw new RuntimeException("Unauthorized loan access");
        }

        return loan;
    }

    private void validateEligibilityInput(double income, double creditScore, double requestedAmount, String pan, String adhar) {
        if (income <= 0) {
            throw new IllegalArgumentException("Monthly income must be greater than zero");
        }
        if (requestedAmount <= 0) {
            throw new IllegalArgumentException("Requested loan amount must be greater than zero");
        }
        if (creditScore < minimumCreditScore || creditScore > 850) {
            throw new IllegalArgumentException("Credit score must be between " + (int) minimumCreditScore + " and 850");
        }

        String normalizedPan = normalizePan(pan);
        if (normalizedPan.length() < 10 || normalizedPan.length() > 12) {
            throw new IllegalArgumentException("PAN number must be between 10 and 12 characters");
        }

        String normalizedAdhar = normalizeAdhar(adhar);
        if (normalizedAdhar.length() < 10 || normalizedAdhar.length() > 14) {
            throw new IllegalArgumentException("Aadhaar number must be between 10 and 14 digits");
        }
    }

    private BankAccount syncKycAndValidate(BankAccount bank, String pan, String adhar) {
        BankAccount syncedBank = bankService.syncKycDetails(bank, adhar, pan);
        String normalizedPan = normalizePan(pan);
        String normalizedAdhar = normalizeAdhar(adhar);

        if (!normalizedPan.equals(normalizePan(syncedBank.getPan()))) {
            throw new IllegalArgumentException("PAN could not be linked to your logged-in bank account");
        }
        if (!normalizedAdhar.equals(normalizeAdhar(syncedBank.getAdhar()))) {
            throw new IllegalArgumentException("Aadhaar could not be linked to your logged-in bank account");
        }
        if (!syncedBank.isVerified()) {
            throw new IllegalStateException("Bank account must be verified before checking loan eligibility");
        }
        return syncedBank;
    }

    private Map<String, Object> callLoanEligibilityModel(Map<String, Object> payload) {
        try {
            Map<String, Object> response = restTemplate.postForObject(loanCheckUrl, payload, Map.class);
            if (response == null || !response.containsKey("eligible") || !response.containsKey("probability")) {
                throw new IllegalStateException("Loan eligibility service returned an incomplete response");
            }
            return response;
        } catch (RestClientException ex) {
            throw new IllegalStateException("Loan eligibility service is temporarily unavailable. Please try again shortly.", ex);
        }
    }

    private double extractProbability(Map<String, Object> response) {
        Object probability = response.get("probability");
        if (!(probability instanceof Number number)) {
            throw new IllegalStateException("Loan eligibility service returned an invalid probability score");
        }
        return number.doubleValue();
    }

    private double fetchAdvisoryProbability(Map<String, Object> payload, double creditScore, double requestedAmount, double salaryCap) {
        try {
            return extractProbability(callLoanEligibilityModel(payload));
        } catch (IllegalStateException advisoryFailure) {
            return estimateProbabilityFromBusinessRules(creditScore, requestedAmount, salaryCap);
        }
    }

    private double estimateProbabilityFromBusinessRules(double creditScore, double requestedAmount, double salaryCap) {
        double normalizedCredit = Math.max(0, Math.min((creditScore - minimumCreditScore) / Math.max(1, 850 - minimumCreditScore), 1));
        double salaryHeadroom = salaryCap <= 0 ? 0 : Math.max(0, Math.min(1 - (requestedAmount / salaryCap), 1));
        return Math.max(0.05, Math.min(0.98, 0.55 + (normalizedCredit * 0.3) + (salaryHeadroom * 0.15)));
    }

    private String normalizedStatus(String status) {
        return status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizePan(String pan) {
        return bankService.normalizePan(pan);
    }

    private String normalizeAdhar(String adhar) {
        return bankService.normalizeAdhar(adhar);
    }

    private boolean isActiveLoan(LoanApplication loan) {
        String status = normalizedStatus(loan.getStatus());
        if (status.equals("PENDING") || status.equals("APPROVED")) {
            return true;
        }
        return loan.isApproved() && !status.equals("PAID") && !status.equals("REJECTED");
    }

    private boolean isApprovedOrClosedLoan(LoanApplication loan) {
        String status = normalizedStatus(loan.getStatus());
        return loan.isApproved() || status.equals("APPROVED") || status.equals("PAID");
    }

    private String resolvedLoanStatus(LoanApplication loan) {
        String status = normalizedStatus(loan.getStatus());
        if (!status.isBlank()) {
            return status;
        }
        return loan.isApproved() ? "APPROVED" : "PENDING";
    }

    private int validateTenure(Integer rawTenure, int min, int max, String unitLabel) {
        if (rawTenure == null || rawTenure < min || rawTenure > max) {
            throw new RuntimeException("Please choose a valid tenure in " + unitLabel + " between " + min + " and " + max);
        }
        return rawTenure;
    }

    private void upsertPlanSetupEntry(LoanApplication loan, LoanSummaryResponse summary) {
        Optional<LoanRepayment> existingPlanSetup = repaymentRepo.findByLoanIdOrderByPaymentDateDesc(loan.getId())
                .stream()
                .filter(r -> "PLAN_SETUP".equalsIgnoreCase(r.getEntryType()))
                .findFirst();

        LoanRepayment setupEntry = existingPlanSetup.orElseGet(LoanRepayment::new);
        setupEntry.setLoanId(loan.getId());
        setupEntry.setUser(loan.getUser());
        setupEntry.setUsername(loan.getUsername());
        setupEntry.setEntryType("PLAN_SETUP");
        setupEntry.setAmountPaid(0);
        setupEntry.setPrincipalComponent(0);
        setupEntry.setInterestComponent(0);
        setupEntry.setBalanceBeforePayment(summary.getTotalPayable());
        setupEntry.setRemainingBalance(summary.getRemainingBalance());
        setupEntry.setTotalPaidAfterPayment(summary.getTotalPaid());
        setupEntry.setPaymentDate(LocalDateTime.now());
        repaymentRepo.save(setupEntry);
    }

    private LoanSummaryResponse buildLoanSummary(LoanApplication loan) {
        RepaymentPlanType planType = RepaymentPlanType.fromNullable(loan.getRepaymentPlanType());
        List<LoanRepayment> payments = repaymentRepo.findByLoanIdOrderByPaymentDateDesc(loan.getId())
                .stream()
                .filter(r -> "PAYMENT".equalsIgnoreCase(r.getEntryType()))
                .toList();

        double totalPaid = payments.stream().mapToDouble(LoanRepayment::getAmountPaid).sum();
        double interestPaid = payments.stream().mapToDouble(LoanRepayment::getInterestComponent).sum();
        double principalPaid = payments.stream().mapToDouble(LoanRepayment::getPrincipalComponent).sum();
        double totalInterest = planType == null ? 0 : calculateTotalInterest(loan.getAmount(), planType, loan.getTenureMonths());
        double totalPayable = loan.getAmount() + totalInterest;
        double remainingBalance = Math.max(totalPayable - totalPaid, 0);
        double interestRemaining = Math.max(totalInterest - interestPaid, 0);
        double principalRemaining = Math.max(loan.getAmount() - principalPaid, 0);

        LoanSummaryResponse summary = new LoanSummaryResponse();
        summary.setId(loan.getId());
        summary.setUsername(loan.getUsername());
        summary.setStatus(resolvedLoanStatus(loan));
        summary.setApproved(loan.isApproved());
        summary.setPlanConfigured(planType != null);
        summary.setPrincipal(loan.getAmount());
        summary.setMonthlyIncome(loan.getMonthlyIncome());
        summary.setSalaryCap(loan.getMonthlyIncome() * 10);
        summary.setRepaymentPlanType(planType == null ? null : planType.name());
        summary.setRepaymentPlanLabel(planType == null ? null : planType.getLabel());
        summary.setInterestRate(planType == null ? 0 : loan.getInterestRate());
        summary.setTenureMonths(loan.getTenureMonths());
        summary.setTenureYears(planType == RepaymentPlanType.YEARLY_15 && loan.getTenureMonths() != null
                ? loan.getTenureMonths() / 12
                : null);
        summary.setInstallmentAmount(planType == null ? null : calculateInstallment(totalPayable, planType, loan.getTenureMonths()));
        summary.setInstallmentLabel(planType == null ? null : planType.getInstallmentLabel());
        summary.setTotalInterest(totalInterest);
        summary.setTotalPayable(totalPayable);
        summary.setTotalPaid(totalPaid);
        summary.setRemainingBalance(remainingBalance);
        summary.setPrincipalPaid(principalPaid);
        summary.setPrincipalRemaining(principalRemaining);
        summary.setInterestPaid(interestPaid);
        summary.setInterestRemaining(interestRemaining);
        summary.setPaymentsMade(payments.size());
        return summary;
    }

    private double calculateTotalInterest(double principal, RepaymentPlanType planType, Integer tenureMonths) {
        return switch (planType) {
            case MONTHLY_EMI_3 -> principal * planType.getInterestRate() * safeTenure(tenureMonths);
            case YEARLY_15 -> principal * planType.getInterestRate() * safeTenure(tenureMonths) / 12.0;
            case FLEXIBLE_10 -> principal * planType.getInterestRate();
        };
    }

    private Double calculateInstallment(double totalPayable, RepaymentPlanType planType, Integer tenureMonths) {
        return switch (planType) {
            case MONTHLY_EMI_3 -> totalPayable / safeTenure(tenureMonths);
            case YEARLY_15 -> totalPayable / (safeTenure(tenureMonths) / 12.0);
            case FLEXIBLE_10 -> null;
        };
    }

    private int safeTenure(Integer tenureMonths) {
        if (tenureMonths == null || tenureMonths <= 0) {
            throw new IllegalStateException("Tenure must be configured for the selected repayment plan");
        }
        return tenureMonths;
    }

    private double getAverageTransactionAmount(int userId, double currentAmount) {
        List<Transaction> pastTransactions = txRepo.findByUserId(userId);
        double total = pastTransactions.stream().mapToDouble(Transaction::getAmount).sum();
        return pastTransactions.isEmpty() ? currentAmount : (total + currentAmount) / (pastTransactions.size() + 1);
    }
}
