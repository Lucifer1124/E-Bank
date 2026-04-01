package backend.backend.controller;

// PaymentController.java


import backend.backend.model.BankAccount;
import backend.backend.model.Transaction;
import backend.backend.model.User;
import backend.backend.repository.BankAccountRepository;
import backend.backend.repository.TransactionRepository;
import backend.backend.repository.UserRepository;
import backend.backend.service.RazorpayService;
import com.razorpay.Order;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Autowired
    private RazorpayService razorpayService;
    @Autowired
    private TransactionRepository transactionRepo;
    @Autowired
    private BankAccountRepository bankRepo;
    @Autowired
    private UserRepository userRepository;

    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> data) {
        try {
            int amount = (int) data.get("amount");
            System.out.println(amount);
            String receipt = "txn_" + System.currentTimeMillis();

            Order order = razorpayService.createOrder(amount, receipt);

            JSONObject response = new JSONObject();
            response.put("orderId", order.get("id").toString());
            response.put("amount", order.get("amount").toString());
            response.put("currency", order.get("currency").toString());
            response.put("key", "rzp_test_RVPxvjAjcRvhXL"); // send public key directly

            return ResponseEntity.ok(response.toMap()); // return as Map for JSON
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }


    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> data) {
        try {
            //  Extract data from frontend
            String orderId = data.get("razorpay_order_id");
            String paymentId = data.get("razorpay_payment_id");
            String signature = data.get("razorpay_signature");
            String amountStr = data.get("amount");
            String username = data.get("username");

            System.out.println(amountStr+" "+username+" "+signature);// frontend must send JWT-sub username

            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Username missing"));
            }
            if (amountStr == null || amountStr.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Amount missing"));
            }

            double amount = Double.parseDouble(amountStr); // safe parse
            if (amount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid amount"));
            }

            // 2️ Verify Razorpay signature
            boolean verified = razorpayService.verifySignature(orderId, paymentId, signature);
            if (!verified) {
                System.out.println("failed");
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid signature"));

            }

            // 3️Find user's bank account using username
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            BankAccount account = bankRepo.findByUser(user)
                    .orElseThrow(() -> new RuntimeException("Bank account not found"));

            //  Update balance
            account.setBalance(account.getBalance() + amount);
            bankRepo.save(account);

            // Save transaction
            Transaction txn = new Transaction();
            txn.setSenderAccount("RAZORPAY_TOPUP");
            txn.setReceiverAccount(account.getAccountNumber());
            txn.setAmount(amount);
            txn.setBalance(account.getBalance());
            txn.setIsForeign(0);
            txn.setIsHighRisk(0);
            txn.setFraud_probability(0);
            txn.setIs_fraud(0);
            txn.setUserId(user.getId().intValue());
            transactionRepo.save(txn);

            //  Response
            return ResponseEntity.ok(Map.of("success", true, "message", "Payment verified & balance updated"));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }


}

