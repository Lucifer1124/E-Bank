package backend.backend.model;

public enum RepaymentPlanType {
    MONTHLY_EMI_3("3% Monthly EMI", 0.03, true, "Monthly EMI"),
    YEARLY_15("15% Yearly", 0.15, true, "Yearly installment"),
    FLEXIBLE_10("10% Flexible", 0.10, false, "Flexible payment");

    private final String label;
    private final double interestRate;
    private final boolean requiresTenure;
    private final String installmentLabel;

    RepaymentPlanType(String label, double interestRate, boolean requiresTenure, String installmentLabel) {
        this.label = label;
        this.interestRate = interestRate;
        this.requiresTenure = requiresTenure;
        this.installmentLabel = installmentLabel;
    }

    public String getLabel() {
        return label;
    }

    public double getInterestRate() {
        return interestRate;
    }

    public boolean requiresTenure() {
        return requiresTenure;
    }

    public String getInstallmentLabel() {
        return installmentLabel;
    }

    public static RepaymentPlanType from(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new IllegalArgumentException("Repayment plan is required");
        }

        for (RepaymentPlanType value : values()) {
            if (value.name().equalsIgnoreCase(rawValue.trim())) {
                return value;
            }
        }

        throw new IllegalArgumentException("Unsupported repayment plan: " + rawValue);
    }

    public static RepaymentPlanType fromNullable(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        return from(rawValue);
    }
}
