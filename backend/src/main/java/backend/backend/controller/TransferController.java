package backend.backend.controller;

import backend.backend.model.Transaction;
import backend.backend.requests.AccountDetailsResponse;
import backend.backend.requests.TransferRequest;
import backend.backend.security.CustomUserDetails;
import backend.backend.service.BankService;
import backend.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transfer")
public class TransferController {
    private final BankService bankService;


    public TransferController(BankService bankService) {
        this.bankService = bankService;

    }

    @PostMapping("/transfer")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> transfer(@RequestBody TransferRequest request,
                                      @AuthenticationPrincipal CustomUserDetails userDetails) {
        String username = userDetails.getUsername();
        Long user_id=userDetails.getUser_id();
        try {
            Transaction tx = bankService.transfer(username,user_id, request.getSenderAccount(), request.getReceiverAccount(), request.getAmount(),request.getPassword());
            return ResponseEntity.ok(tx);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

}
