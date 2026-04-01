package backend.backend.service;

import backend.backend.model.BankAccount;
import backend.backend.model.Transaction;
import backend.backend.model.User;
import backend.backend.repository.BankAccountRepository;
import backend.backend.repository.TransactionRepository;
import backend.backend.repository.UserRepository;
import backend.backend.requests.AccountDetailsResponse;
import backend.backend.requests.TransactionResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final BankAccountRepository bankRepo;
    private final TransactionRepository txRepo;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, BankAccountRepository bankRepo, TransactionRepository txRepo) {
        this.userRepo = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bankRepo = bankRepo;
        this.txRepo = txRepo;
    }

    // Register user
    public String registerUser(User user) {
        Optional<User> existing = userRepo.findByUsername(user.getUsername());
        if (existing.isPresent()) {
            return "Username already exists!";
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole("USER");


        userRepo.save(user);

        return "Signup successful!";
    }
    public List<User> getAllUsers() {
       return userRepo.findAll();
    }

    public User getUserById(Long id) {
        return userRepo.findById(id).orElseThrow();
    }

    public User updateUser(Long id, User updated) {
        User user = userRepo.findById(id).orElseThrow();
        user.setEmail(updated.getEmail());
        user.setMobile(updated.getMobile());
        user.setRole(updated.getRole());
        return userRepo.save(user);
    }

    public void deleteUser(Long id) {
        userRepo.deleteById(id);
    }

    // Authenticate login
    public User authenticate(String username, String password) {
        Optional<User> userOpt = userRepo.findByUsername(username);
        if (userOpt.isEmpty()) return null;

        User user = userOpt.get();
        if (passwordEncoder.matches(password, user.getPassword())) {
            return user;
        }
        return null;
    }


}