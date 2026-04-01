package backend.backend.repository;

import backend.backend.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findTopByUserIdOrderByTimestampDesc(int userId);

    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId ORDER BY t.timestamp DESC")
    List<Transaction> findRecentTransactions(@Param("userId") int userId, Pageable pageable);

    List<Transaction> findByUserId(int userId);
    @Query("SELECT t FROM Transaction t ORDER BY t.timestamp DESC")
    List<Transaction> findAllTransactions();
    List<Transaction> findBySenderAccountOrReceiverAccountOrderByTimestampDesc(String senderAccount, String receiverAccount);

}