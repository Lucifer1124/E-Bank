package backend.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class LoanEligibilityRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String username;
    private double income;
    private String pan;
    private String adhar;
    private double creditScore;
    private double requestedAmount;
    private double balance;
    private double avg_transaction;
    private double maxAmount;
    private boolean eligible;
    private double probability;

    private boolean applied = false;

    @PrePersist
    public void prePersist() {
        if (this.maxAmount <= 0 && this.income > 0) {
            this.maxAmount = this.income * 10;
        }
    }

    // true when user submits actual loan application
}
