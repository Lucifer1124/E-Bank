package backend.backend.controller;

import backend.backend.model.LoanRepayment;
import backend.backend.model.Transaction;
import backend.backend.security.CustomUserDetails;
import backend.backend.service.AccountService;
import backend.backend.service.GeminiService;
import backend.backend.service.LoanService;
import backend.backend.repository.LoanRepaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    @Autowired
    private AccountService accountService;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private LoanService loanService;

    @Autowired
    private LoanRepaymentRepository loanRepaymentRepository;

    @PostMapping
    public ResponseEntity<String> chat(@AuthenticationPrincipal CustomUserDetails userDetails,
                                       @RequestBody Map<String, String> body) {
        String query = body.get("query");
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Please enter a valid query.");
        }

        String normalized = query.toLowerCase().trim();
        String username = userDetails.getUsername();
        Long userId = userDetails.getUser_id();

        String response = null;

        try {
            // --- Account Info ---
            if (normalized.contains("account number")) {
                String accNum = accountService.getAccountNumber(userId);
                response = "Your account number is " + accNum;

            } else if (normalized.contains("balance")) {
                double balance = accountService.getBalance(userId);
                response = "Your current balance is ₹" + balance;

            } else if (normalized.contains("last sent")) {
                response = accountService.getLastSentTo(userId.intValue());

            } else if (normalized.contains("last received")) {
                response = accountService.getLastReceivedFrom(userId.intValue(),
                        accountService.getAccountNumber(userId));

            } else if (normalized.contains("last transaction")) {
                Transaction tx = accountService.getLastTransaction(userId.intValue());
                if (tx != null) {
                    response = "Your last transaction was ₹" + tx.getAmount() +
                            " to account " + tx.getReceiverAccount() +
                            " on " + tx.getTimestamp();
                } else {
                    response = "You have no transactions yet.";
                }

            } else if (normalized.contains("last 5 transactions") ||
                    normalized.contains("recent transactions") ||
                    normalized.contains("show transactions")) {

                List<Transaction> txs = accountService.getLastNTransactions(userId.intValue(), 5);
                if (txs.isEmpty()) {
                    response = "You have no recent transactions.";
                } else {
                    response = txs.stream()
                            .map(tx -> "₹" + tx.getAmount() + " to " + tx.getReceiverAccount() +
                                    " on " + tx.getTimestamp())
                            .collect(Collectors.joining("\n"));
                }

            } else if (normalized.contains("loan") || normalized.contains("my loans")) {
                List<LoanRepayment> repayments =
                        loanRepaymentRepository.findAccessibleByUsernameOrderByPaymentDateDesc(username);

                if (repayments.isEmpty()) {
                    response = "You don't have any loan repayment records.";
                } else {
                    response = repayments.stream()
                            .map(lr -> "Loan ID: " + lr.getId() +
                                    " | Paid: ₹" + lr.getAmountPaid() +
                                    " | Remaining: ₹" + lr.getRemainingBalance())
                            .collect(Collectors.joining("\n"));
                }

            } else {
                // Fallback to Gemini AI
                response = geminiService.chatWithGemini(query);
            }

        } catch (Exception e) {
            response = "Sorry, something went wrong while processing your query: " + e.getMessage();
        }

        return ResponseEntity.ok(response);
    }
}
