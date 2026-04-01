package backend.backend.requests;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AccountDetailsResponse {
    private String accountNumber;
    private double balance;

    private String ownerName;
    private List<TransactionResponse> transactions;
}
