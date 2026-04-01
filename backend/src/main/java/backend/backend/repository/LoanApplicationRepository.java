package backend.backend.repository;

import backend.backend.model.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {
    List<LoanApplication> findByUsername(String username);
    List<LoanApplication> findByUsernameAndStatus(String username, String status);

    @Query("""
            SELECT l FROM LoanApplication l
            LEFT JOIN l.user u
            WHERE l.username = :username
               OR u.username = :username
            """)
    List<LoanApplication> findAccessibleByUsername(@Param("username") String username);

    @Query("""
            SELECT l FROM LoanApplication l
            LEFT JOIN l.user u
            WHERE (l.username = :username OR u.username = :username)
              AND UPPER(COALESCE(l.status, '')) = UPPER(:status)
            """)
    List<LoanApplication> findAccessibleByUsernameAndStatus(@Param("username") String username, @Param("status") String status);

}
