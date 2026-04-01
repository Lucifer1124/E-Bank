package backend.backend.controller;

import backend.backend.model.LoanApplication;
import backend.backend.model.LoanRepayment;
import backend.backend.requests.LoanPlanSelectionRequest;
import backend.backend.requests.LoanSummaryResponse;
import backend.backend.repository.LoanApplicationRepository;
import backend.backend.repository.LoanRepaymentRepository;
import backend.backend.repository.UserRepository;
import backend.backend.security.CustomUserDetails;
import backend.backend.service.LoanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/repay")
public class LoanRepayController {
    @Autowired
    private LoanService loanService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private LoanApplicationRepository loanApplicationRepository;
    @Autowired
    LoanRepaymentRepository loanRepaymentRepository;
    @GetMapping("/user/approved")
    public List<LoanSummaryResponse> getUserApprovedLoans(@AuthenticationPrincipal CustomUserDetails userDetails) {
        String username = userDetails.getUsername();
        return loanService.getApprovedLoanSummaries(username);
    }

    @PostMapping("/plan/{loanId}")
    public ResponseEntity<?> configureRepaymentPlan(
            @PathVariable Long loanId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody LoanPlanSelectionRequest body) {
        try {
            return ResponseEntity.ok(loanService.configureRepaymentPlan(loanId, userDetails.getUsername(), body));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    // Repay loan
    @PostMapping("/repay/{loanId}")
    public ResponseEntity<?> repayLoan(
            @PathVariable Long loanId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        try {
            double amount = Double.parseDouble(body.get("amount").toString());
            return ResponseEntity.ok(loanService.repayLoan(loanId, amount, userDetails.getUsername()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/repayments")
    public List<LoanRepayment> getUserRepayments(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return loanRepaymentRepository.findAccessibleByUsernameOrderByPaymentDateDesc(userDetails.getUsername());
    }
    @GetMapping("/admin/repayments")
    public ResponseEntity<List<LoanRepayment>> getAllRepayments(
            @RequestParam(required = false) String username) {

        List<LoanRepayment> repayments;

        if (username != null && !username.isBlank()) {
            repayments = loanRepaymentRepository.findAccessibleByUsernameOrderByPaymentDateDesc(username);
        } else {
            repayments = loanRepaymentRepository.findAll()
                    .stream()
                    .sorted((a, b) -> b.getPaymentDate().compareTo(a.getPaymentDate()))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(repayments);
    }
   /* @GetMapping("/admin/repayments")
    @PreAuthorize("hasRole('ADMIN')")
    public List<LoanRepayment> getRepayments(@AuthenticationPrincipal CustomUserDetails userDetails)
    {

        if(userDetails.getUsername().equals("ADMIN123"))
          return loanRepaymentRepository.findAll();
        else
            return loanRepaymentRepository.findByUsernameOrderByPaymentDateDesc(userDetails.getUsername());

    }*/

}
