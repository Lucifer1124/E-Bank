package backend.backend.requests;

import lombok.Data;

@Data
public class LoanSummaryResponse {
    private Long id;
    private String username;
    private String status;
    private boolean approved;
    private boolean planConfigured;
    private double principal;
    private double monthlyIncome;
    private double salaryCap;
    private String repaymentPlanType;
    private String repaymentPlanLabel;
    private double interestRate;
    private Integer tenureMonths;
    private Integer tenureYears;
    private Double installmentAmount;
    private String installmentLabel;
    private double totalInterest;
    private double totalPayable;
    private double totalPaid;
    private double remainingBalance;
    private double principalPaid;
    private double principalRemaining;
    private double interestPaid;
    private double interestRemaining;
    private int paymentsMade;
}
