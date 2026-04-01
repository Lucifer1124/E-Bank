package backend.backend.requests;

import lombok.Data;

@Data
public class LoanPlanSelectionRequest {
    private String planType;
    private Integer tenure;
}
