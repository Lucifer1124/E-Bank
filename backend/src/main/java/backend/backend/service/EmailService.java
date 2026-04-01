package backend.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;


    @Service
    public class EmailService {
        private static final Logger log = LoggerFactory.getLogger(EmailService.class);

        @Autowired
        private JavaMailSender mailSender;

        public void sendEmail(String to, String subject, String body) {
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setTo(to);
                msg.setSubject(subject);
                msg.setText(body);
                mailSender.send(msg);
            } catch (RuntimeException ex) {
                log.warn("Email delivery failed for subject '{}': {}", subject, ex.getMessage());
            }
        }
    }
