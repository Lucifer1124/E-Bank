package backend.backend.model;



import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password; // store bcrypt hashed password
    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String mobile;

    @Column(nullable = false)
    private String role;

    @JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<LoanApplication> loanApplications = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<LoanEligibilityRequest> loanEligibilityRequests = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<LoanRepayment> loanRepayments = new ArrayList<>();
}
