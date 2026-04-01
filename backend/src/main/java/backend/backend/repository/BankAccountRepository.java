package backend.backend.repository;

import backend.backend.model.BankAccount;
import backend.backend.model.Transaction;
import backend.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    Optional<BankAccount> findByUser(User user);
    Optional<BankAccount> findByAccountNumber(String accountNumber);
    List<BankAccount> findAll();
    boolean existsByPan(String pan);
    boolean existsByAdhar(String adhar);
    Optional<BankAccount> findByPanIgnoreCase(String pan);
    Optional<BankAccount> findByAdhar(String adhar);
    Optional<BankAccount> findByUserUsername(String username);


   Optional<BankAccount> findById(Long id);
    Optional<BankAccount> findByUserId(Long id);

}
