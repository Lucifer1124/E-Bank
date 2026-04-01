package backend.backend.service;

// AdminInitializer.java


import backend.backend.model.User;
import backend.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    CommandLineRunner initAdmin() {
        return args -> {
            if (!userRepository.existsByUsername("ADMIN123")) {
                User admin = new User();
                admin.setUsername("ADMIN123");
                admin.setPassword(passwordEncoder.encode("123456"));
                admin.setRole("ADMIN");
                admin.setEmail("admin@gmail.com");
                admin.setMobile("8017798434");
                userRepository.save(admin);
                System.out.println("Admin user created: admin / admin123");
            }
        };
    }
}

