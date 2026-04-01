package backend.backend.controller;


import backend.backend.model.BankAccount;
import backend.backend.model.Transaction;
import backend.backend.model.User;
import backend.backend.repository.BankAccountRepository;
import backend.backend.repository.UserRepository;
import backend.backend.requests.AccountRequest;
import backend.backend.security.CustomUserDetails;
import backend.backend.service.AccountService;
import backend.backend.service.BankService;
import backend.backend.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import backend.backend.service.BankService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class AccountController {
    private final AccountService accountService;
    private final UserRepository userRepo;
    private final BankAccountRepository bankRepo;
    private final BankService bankService;


    public AccountController(AccountService accountService, TransactionService transactionService, UserRepository userRepo, BankAccountRepository bankRepo, BankService bankService) {
        this.accountService = accountService;

        this.userRepo = userRepo;
        this.bankRepo = bankRepo;


        this.bankService = bankService;
    }
    @GetMapping("/me/account")
    public ResponseEntity<Map<String, Object>> getMyAccount(@AuthenticationPrincipal CustomUserDetails userDetails) {
        
        if (userDetails == null) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("error", "Unauthorized");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
        }
        String username = userDetails.getUsername();
        return userRepo.findByUsername(username)
                .flatMap(u -> bankRepo.findByUserId(u.getId()))
                .map(acc -> {
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("accountNumber", acc.getAccountNumber());
                    body.put("adhar", acc.getAdhar());
                    body.put("pan", acc.getPan());
                    body.put("type", acc.getType());
                    body.put("verified", acc.isVerified());
                    return ResponseEntity.ok(body);
                })
                .orElseGet(() -> {
                    Map<String, Object> body = new LinkedHashMap<>();
                    body.put("error", "No bank account found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
                });
    }

    //  Get account balance
    @GetMapping("/balance")
    public ResponseEntity<String> getBalance(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails.getUser_id() ;
        double balance = accountService.getBalance(userId);
        return ResponseEntity.ok("Your current balance is ₹" + balance);
    }

    //  Get all transactions
    @GetMapping("/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Long userId = userDetails.getUser_id();
        List<Transaction> transactions = accountService.getTransactionById(userId.intValue());
        return ResponseEntity.ok(transactions);
    }

    @PostMapping("/create-account")
    public ResponseEntity<?> createBankAccount(@RequestBody AccountRequest request) {
        try {
            User user = userRepo.findByUsername(request.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            BankAccount account = bankService.createAccount(user, request.getAdhar(), request.getPan(), request.getType());
            return ResponseEntity.ok(account);

        } catch (RuntimeException e) {
            // Return a readable message to frontend
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            // Handle unexpected errors gracefully
            return ResponseEntity.status(500).body(Map.of("error", "Something went wrong. Please try again."));
        }
    }


}
