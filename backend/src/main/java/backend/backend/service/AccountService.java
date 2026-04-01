package backend.backend.service;

import backend.backend.model.BankAccount;
import backend.backend.model.Transaction;
import backend.backend.repository.BankAccountRepository;
import backend.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.awt.print.Pageable;
import java.util.List;

@Service
public class AccountService {

    @Autowired
    private BankAccountRepository bankRepo;

    @Autowired
    private TransactionRepository txRepo;
    public BankAccount getAccount(String username) {
        return bankRepo.findByUserUsername(username)
                .orElseThrow(() -> new RuntimeException("Account not found"));
    }



    public double getBalance(Long userId) {
        return bankRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Account not found"))
                .getBalance();
    }

    public Transaction getLastTransaction(int userId) {
        return txRepo.findTopByUserIdOrderByTimestampDesc(userId)
                .orElseThrow(() -> new RuntimeException("No transactions found"));
    }

    public List<Transaction> getTransactionById(int userId) {
        BankAccount account = bankRepo.findByUserId((long) userId)
                .orElseThrow(() -> new RuntimeException("Bank account not found"));

        String accountNumber = account.getAccountNumber();

        return txRepo.findBySenderAccountOrReceiverAccountOrderByTimestampDesc(accountNumber, accountNumber);
    }


    public List<Transaction> getLastNTransactions(int userId, int n) {
        return txRepo.findRecentTransactions(userId,  PageRequest.of(0, n));
    }

    public String getLastSentTo(int userId) {
        Transaction tx = txRepo.findTopByUserIdOrderByTimestampDesc(userId)
                .orElseThrow(() -> new RuntimeException("No transactions found"));

        // If the user was the sender
        return "You last sent ₹" + tx.getAmount() + " to account " + tx.getReceiverAccount();
    }

    public String getLastReceivedFrom(int userId, String myAccountNumber) {
        Transaction tx = txRepo.findTopByUserIdOrderByTimestampDesc(userId)
                .orElseThrow(() -> new RuntimeException("No transactions found"));

        // If the user was the receiver
        if (myAccountNumber.equals(tx.getReceiverAccount())) {
            return "You last received ₹" + tx.getAmount() + " from account " + tx.getSenderAccount();
        } else {
            return "No incoming transactions found recently.";
        }
    }
    public String getAccountNumber(Long userId) {
        return bankRepo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Account not found"))
                .getAccountNumber();
    }


}
