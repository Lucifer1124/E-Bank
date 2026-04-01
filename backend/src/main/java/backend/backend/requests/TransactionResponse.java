package backend.backend.requests;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TransactionResponse {
    private String senderAccount;
    private String receiverAccount;
    private double amount;
    private double balanceAfter;
    private LocalDateTime timestamp;
    private int isForeign;
}

