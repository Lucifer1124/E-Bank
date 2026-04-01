package backend.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class LoanApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String username;
    private double amount;
    private double monthlyIncome;
    private boolean approved = false;
    private String status;
    private String repaymentPlanType;
    private double interestRate;
    private Integer tenureMonths;
    private LocalDateTime approvedAt;
}
