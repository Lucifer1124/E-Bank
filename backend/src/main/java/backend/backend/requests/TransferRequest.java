package backend.backend.requests;

import lombok.Data;

@Data
public class TransferRequest {
    private String senderAccount;
    private String receiverAccount;
    private double amount;
    private String password;

}
