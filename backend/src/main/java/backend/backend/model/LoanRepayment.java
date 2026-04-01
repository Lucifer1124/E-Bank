package backend.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class LoanRepayment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long loanId;
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    private String username;
    private String entryType = "PAYMENT";
    private double amountPaid;
    private double principalComponent;
    private double interestComponent;
    private double balanceBeforePayment;
    private double totalPaidAfterPayment;
    private LocalDateTime paymentDate;
    private double remainingBalance;
}
