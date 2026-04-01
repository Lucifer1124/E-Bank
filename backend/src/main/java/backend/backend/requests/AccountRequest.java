package backend.backend.requests;

import lombok.Data;

@Data
public class AccountRequest {
    private String username;
    private String adhar;
    private String pan;
    private String type;
}
