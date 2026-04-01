package backend.backend.controller;

import backend.backend.model.Transaction;
import backend.backend.repository.TransactionRepository;
import backend.backend.requests.TransferRequest;
import backend.backend.security.CustomUserDetails;
import backend.backend.service.BankService;
import backend.backend.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")

public class Fcontroller {

    private final TransactionService transactionService;

    private final TransactionRepository tRepo;


    @Autowired
    public Fcontroller(TransactionService transactionService, TransactionRepository tRepo, BankService bankService) {
        this.transactionService = transactionService;
        this.tRepo = tRepo;

    }


    //  Get all transactions (for admin dashboard)
    @GetMapping("/all")
    public List<Transaction> getAll() {
        return transactionService.getAllTransactions();
    }

    @GetMapping("/check")
    public List<Transaction> checkallfrauds() {
        List<Transaction> all = transactionService.getAllTransactions();
        return transactionService.checkFraud(all);
    }
}
