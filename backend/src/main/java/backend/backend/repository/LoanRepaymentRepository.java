package backend.backend.repository;

import backend.backend.model.LoanRepayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanRepaymentRepository extends JpaRepository<LoanRepayment, Long> {
    List<LoanRepayment> findByUsernameOrderByPaymentDateDesc(String username);
    List<LoanRepayment> findByLoanIdOrderByPaymentDateDesc(Long loanId);
    void deleteByLoanId(Long loanId);

    @Query("""
            SELECT r FROM LoanRepayment r
            LEFT JOIN r.user u
            WHERE r.username = :username
               OR u.username = :username
            ORDER BY r.paymentDate DESC
            """)
    List<LoanRepayment> findAccessibleByUsernameOrderByPaymentDateDesc(@Param("username") String username);

}
