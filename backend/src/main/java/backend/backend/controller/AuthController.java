package backend.backend.controller;

import backend.backend.model.BankAccount;
import backend.backend.model.PasswordResetToken;
import backend.backend.model.Transaction;
import backend.backend.model.User;
import backend.backend.repository.BankAccountRepository;
import backend.backend.repository.PasswordResetTokenRepository;
import backend.backend.repository.TransactionRepository;
import backend.backend.repository.UserRepository;
import backend.backend.requests.*;
import backend.backend.security.CustomUserDetails;
import backend.backend.service.BankService;
import backend.backend.service.OtpUtil;
import backend.backend.service.UserService;
import backend.backend.security.JwtUtil;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepo;
    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final BankService bankService;
    private final PasswordEncoder passwordEncoder;


    @Autowired
    private PasswordResetTokenRepository tokenRepo;

    @Autowired
    private JavaMailSender mailSender;


    @Autowired
    public AuthController(UserRepository userRepo, UserService userService, JwtUtil jwtUtil, BankService bankService, PasswordEncoder passwordEncoder, BankAccountRepository bankRepo, TransactionRepository txRepo, BankAccountRepository bankRepo1) {
        this.userRepo = userRepo;
        this.userService = userService;
        this.jwtUtil = jwtUtil;
        this.bankService = bankService;
        this.passwordEncoder = passwordEncoder;

    }

    @PostMapping("/signup")
    public String signup(@RequestBody User user) {
        return userService.registerUser(user);
    }

    @PostMapping("/login")
    public TokenResponse login(@RequestBody AuthRequest request) {
        User user = userService.authenticate(request.getUsername(), request.getPassword());
        if (user == null) throw new RuntimeException("Invalid username or password");

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return new TokenResponse(token, user.getRole());
    }
    @PreAuthorize("hasAuthority('USER')")
    @PostMapping("/create-account")
    public ResponseEntity<?> createBankAccount(@RequestBody AccountRequest request) {
        User user = userRepo.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        BankAccount account = bankService.createAccount(user, request.getAdhar(), request.getPan(), request.getType());
        return ResponseEntity.ok(account);
    }



    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody  ForgotPasswordRequest request) {
        String email = request.getEmail();

         User user=userRepo.findByEmail(email).orElseThrow(()->new UsernameNotFoundException("Email Not Found"));
         if(user==null)
         {
             String otp = OtpUtil.generateOtp();

             PasswordResetToken token = new PasswordResetToken();
             token.setEmail(email);
             token.setOtp(otp);
             token.setExpiryTime(LocalDateTime.now().plusMinutes(10));
             tokenRepo.save(token);

             // generate OTP, send mail...
             SimpleMailMessage message = new SimpleMailMessage();
             message.setTo(email);
             message.setSubject("Password Reset OTP");
             message.setText("Your OTP is: " + otp);
             mailSender.send(message);


             return ResponseEntity.ok("OTP sent to email");
         }else
         {
             return ResponseEntity.ok("Email does not exists");
         }


    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        String email = request.getEmail();
        String otp = request.getOtp();
        String newPassword = request.getNewPassword();
        // validate OTP, update password...
        PasswordResetToken token = tokenRepo.findByEmailAndOtp(email, otp)
                .orElseThrow(() -> new RuntimeException("Invalid OTP"));

        if (token.getExpiryTime().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("OTP expired");
        }

        // update user password
        User user = userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepo.save(user);

        tokenRepo.delete(token);
        return ResponseEntity.ok("Password reset successful");
    }

    // DTOs
    @Data
    public static class AuthRequest {
        private String username;
        private String password;


    }

    public static class TokenResponse {
        private final String token;
        private final String role;
        public TokenResponse(String token, String role) {
            this.token = token;
            this.role = role;
        }
        public String getToken() { return token; }
        public String getRole() { return role; }
    }
}