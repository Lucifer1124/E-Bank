package backend.backend.controller;

import backend.backend.model.BankAccount;
import backend.backend.model.User;
import backend.backend.repository.BankAccountRepository;
import backend.backend.requests.BalanceUpdateRequest;
import backend.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")

public class AdminController {

    @Autowired
    private UserService userService;
    @Autowired private BankAccountRepository bankRepo;

    // Get all users
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    //  Get user by ID
    @GetMapping("/user/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    //  Update user info
    @PutMapping("/user/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User updated) {
        return userService.updateUser(id, updated);
    }

    // Delete user
    @DeleteMapping("/user/{id}")
    public String deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        bankRepo.deleteById(id);
        return "User deleted";
    }

    //  Block/unblock user bank account
    @PatchMapping("/block/{id}")
    public String toggleBlock(@PathVariable Long id) {
        BankAccount acc = bankRepo.findById(id).orElseThrow(() -> new RuntimeException("Bank account not found for user ID: " + id));
        acc.setBlocked(!acc.isBlocked());
        bankRepo.save(acc);
        return acc.isBlocked() ? "Account blocked" : "Account unblocked";
    }

    //  View user balance
    @GetMapping("/balance/{id}")
    public double getBalance(@PathVariable Long id) {
        BankAccount acc = bankRepo.findByUserId(id).orElseThrow(() -> new RuntimeException("Bank account not found for user ID: " + id));
        return acc.getBalance();
    }

    // Update user balance
    @PatchMapping("/balance/")

    public ResponseEntity<?> updateUserBalance(@RequestBody BalanceUpdateRequest request) {
        BankAccount account = bankRepo.findByUserId(request.getUserId())
                .orElseThrow(() -> new RuntimeException("Bank account not found"));

        account.setBalance(request.getAmount());
        bankRepo.save(account);

        return ResponseEntity.ok("Balance updated to ₹" + request.getAmount());
    }
    @GetMapping("/accounts")
    public ResponseEntity<List<BankAccount>> getAllAccounts() {
        List<BankAccount> accounts = bankRepo.findAll();
        return ResponseEntity.ok(accounts);
    }
    @GetMapping("/accounts/{id}")
    public ResponseEntity<BankAccount> getAccountById(@PathVariable Long id) {
        return bankRepo.findByUserId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/accounts/{id}")
    public ResponseEntity<?> deleteAccountById(@PathVariable Long id) {
        if (!bankRepo.existsById(id)) {
            return ResponseEntity.status(404)
                    .body("Bank account not found with ID: " + id);
        }

        bankRepo.deleteById(id);
        return ResponseEntity.ok("Bank account deleted successfully with ID: " + id);
    }


}
