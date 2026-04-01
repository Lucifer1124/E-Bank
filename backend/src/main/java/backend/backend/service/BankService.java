package backend.backend.service;

import backend.backend.model.BankAccount;
import backend.backend.model.Transaction;
import backend.backend.model.User;
import backend.backend.repository.BankAccountRepository;
import backend.backend.repository.TransactionRepository;
import backend.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;


@Service
public class BankService {

   @Autowired private BankAccountRepository bankRepo;
    @Autowired private TransactionRepository txRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailService emailService;
    @Autowired private UserRepository userRepo;

    public BankService(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    private String generateAccountNumber() {
        String accountNumber;
        do {
            long num = ThreadLocalRandom.current().nextLong(100000000000L, 1000000000000L); // 12 digits
            accountNumber = String.valueOf(num);
        } while (bankRepo.findByAccountNumber(accountNumber).isPresent());

        return accountNumber;
    }


    public BankAccount createAccount(User user, String adhar, String pan,String type) {
        String normalizedPan = normalizePan(pan);
        String normalizedAdhar = normalizeAdhar(adhar);
        validateKycFormat(normalizedAdhar, normalizedPan);

        if (bankRepo.findByUser(user).isPresent())
            throw new RuntimeException("Account already exists for this user");

        ensureUniqueKyc(null, normalizedAdhar, normalizedPan);

        BankAccount acc = new BankAccount();
        acc.setUser(user);
        acc.setAccountNumber(generateAccountNumber());
        acc.setAdhar(normalizedAdhar);
        acc.setType(type);
        acc.setPan(normalizedPan);
        acc.setBalance(0);
        acc.setVerified(true); // after OTP

        return bankRepo.save(acc);
    }

    @Transactional
    public BankAccount syncKycDetails(BankAccount account, String adhar, String pan) {
        if (account == null) {
            throw new IllegalArgumentException("Bank account not found");
        }

        String normalizedPan = normalizePan(pan);
        String normalizedAdhar = normalizeAdhar(adhar);
        validateKycFormat(normalizedAdhar, normalizedPan);

        boolean samePan = Objects.equals(normalizePan(account.getPan()), normalizedPan);
        boolean sameAdhar = Objects.equals(normalizeAdhar(account.getAdhar()), normalizedAdhar);
        if (samePan && sameAdhar) {
            return account;
        }

        ensureUniqueKyc(account.getId(), normalizedAdhar, normalizedPan);
        account.setPan(normalizedPan);
        account.setAdhar(normalizedAdhar);
        return bankRepo.save(account);
    }

    public String normalizePan(String pan) {
        return pan == null ? "" : pan.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    public String normalizeAdhar(String adhar) {
        return adhar == null ? "" : adhar.replaceAll("\\D+", "");
    }

    private void validateKycFormat(String normalizedAdhar, String normalizedPan) {
        if (normalizedPan.length() < 10 || normalizedPan.length() > 12) {
            throw new IllegalArgumentException("PAN number must be between 10 and 12 characters");
        }
        if (normalizedAdhar.length() < 10 || normalizedAdhar.length() > 14) {
            throw new IllegalArgumentException("Aadhaar number must be between 10 and 14 digits");
        }
    }

    private void ensureUniqueKyc(Long currentAccountId, String normalizedAdhar, String normalizedPan) {
        bankRepo.findByPanIgnoreCase(normalizedPan)
                .filter(existing -> !existing.getId().equals(currentAccountId))
                .ifPresent(existing -> {
                    throw new RuntimeException("PAN already linked to another account");
                });

        bankRepo.findByAdhar(normalizedAdhar)
                .filter(existing -> !existing.getId().equals(currentAccountId))
                .ifPresent(existing -> {
                    throw new RuntimeException("Aadhaar already linked to another account");
                });
    }

    @Transactional
    public Transaction transfer(String username, Long userId, String senderAcc, String receiverAcc, double amount, String password) {
        String requestedSenderAccount = senderAcc == null ? "" : senderAcc.trim();
        String normalizedReceiverAccount = receiverAcc == null ? "" : receiverAcc.trim();

        BankAccount sender = bankRepo.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Sender account not found"));

        User user = sender.getUser();

        if (!sender.getUser().getUsername().equals(username)) {
            throw new SecurityException("Unauthorized: sender account does not belong to you");
        }

        if (!requestedSenderAccount.isEmpty() && !sender.getAccountNumber().equals(requestedSenderAccount)) {
            throw new SecurityException("Unauthorized: sender account does not belong to you");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Incorrect password");
        }

        if (normalizedReceiverAccount.isEmpty()) {
            throw new IllegalArgumentException("Receiver account is required");
        }

        if (sender.getBalance() < amount) {
            throw new IllegalStateException("Insufficient balance");
        }

        if (sender.isBlocked()) {
            throw new IllegalStateException("Account is blocked");
        }
        if(amount<=0)
        {
            throw new IllegalStateException("Amount can not be zero or negative");
        }

        // Deduct from sender
        sender.setBalance(sender.getBalance() - amount);

        Transaction tx = new Transaction();
        tx.setUserId(userId.intValue());
        tx.setSenderAccount(sender.getAccountNumber());
        tx.setAmount(amount);
        tx.setBalance(sender.getBalance());

        // Notify sender
        emailService.sendEmail(
                sender.getUser().getEmail(),
                "Debit Alert",
                "₹" + amount + " has been debited from your account " + sender.getAccountNumber() +
                        ". Available balance: ₹" + sender.getBalance()
        );

        // Try to credit receiver if internal
        Optional<BankAccount> receiverOpt = bankRepo.findByAccountNumber(normalizedReceiverAccount);
        if (receiverOpt.isPresent()) {
            BankAccount receiver = receiverOpt.get();
            receiver.setBalance(receiver.getBalance() + amount);
            bankRepo.save(receiver);

            tx.setReceiverAccount(normalizedReceiverAccount);
            tx.setIsForeign(0);

            // Notify receiver
            emailService.sendEmail(
                    receiver.getUser().getEmail(),
                    "Credit Alert",
                    "₹" + amount + " has been credited to your account " + normalizedReceiverAccount +
                            ". Available balance: ₹" + receiver.getBalance()
            );
        } else {
            // External transfer
            tx.setReceiverAccount(normalizedReceiverAccount); // or "EXTERNAL"
            tx.setIsForeign(1);
        }

        // Risk logic
        int risk = 0;
        if ((sender.getType().equals("SAVINGS") || (receiverOpt.isPresent() && receiverOpt.get().getType().equals("SAVINGS"))) && amount > 500000
                || (sender.getType().equals("CURRENT") || (receiverOpt.isPresent() && receiverOpt.get().getType().equals("CURRENT"))) && amount > 200000) {
            risk = 1;
        }

        if (receiverOpt.isPresent() && receiverOpt.get().getType().equals("SALARY")) {
            risk = 0;
            tx.setIs_fraud(0);
            tx.setFraud_probability(0);
        }

        // Average transaction amount
        List<Transaction> pastTx = txRepo.findByUserId(userId.intValue());
        double total = pastTx.stream().mapToDouble(Transaction::getAmount).sum();
        double avg = pastTx.isEmpty() ? amount : (total + amount) / (pastTx.size() + 1);
        tx.setAvg_amount(avg);

        tx.setIsHighRisk(risk);

        bankRepo.save(sender);
        return txRepo.save(tx);
    }

}
