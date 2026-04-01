package backend.backend.requests;

import lombok.Data;

@Data
public class BalanceUpdateRequest {
    private Long userId;
    private double amount;
}
