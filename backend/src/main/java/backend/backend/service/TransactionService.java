package backend.backend.service;

import backend.backend.model.Transaction;
import backend.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TransactionService {
    @Value("${fraud.ml.url}")
    private String mlUrl;

    @Value("${fraud.ml.batch-size:250}")
    private int fraudBatchSize;

    @Value("${fraud.ml.heuristic-threshold:0.6}")
    private double heuristicThreshold;

    private final TransactionRepository transactionRepository;
    private final RestTemplate restTemplate;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
        this.restTemplate = new RestTemplate();
    }

    public Transaction saveTransaction(Transaction transaction) {
        return transactionRepository.save(transaction);
    }

    // Send transactions to ML in batches and use a heuristic fallback if ML is unavailable.
    public List<Transaction> checkFraud(List<Transaction> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return Collections.emptyList();
        }

        List<Transaction> processed = new ArrayList<>();
        int batchSize = Math.max(1, fraudBatchSize);
        for (int start = 0; start < transactions.size(); start += batchSize) {
            int end = Math.min(start + batchSize, transactions.size());
            processed.addAll(processBatch(transactions.subList(start, end)));
        }
        return processed;
    }

    private List<Transaction> processBatch(List<Transaction> transactions) {
        String endpoint = mlUrl == null ? "" : mlUrl.trim();
        if (endpoint.isEmpty()) {
            return scoreWithHeuristics(transactions);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("transactions", transactions);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, entity, Map.class);
            Object resultBody = response.getBody() == null ? null : response.getBody().get("results");
            if (!(resultBody instanceof List<?> rawResults) || rawResults.size() < transactions.size()) {
                return scoreWithHeuristics(transactions);
            }

            List<Transaction> processed = new ArrayList<>();
            for (int i = 0; i < transactions.size(); i++) {
                Transaction tx = transactions.get(i);
                Object rawResult = rawResults.get(i);
                if (!(rawResult instanceof Map<?, ?> res)) {
                    processed.add(scoreWithHeuristic(tx));
                    continue;
                }

                processed.add(applyPrediction(tx, res));
            }
            return processed;
        } catch (RuntimeException ex) {
            return scoreWithHeuristics(transactions);
        }
    }

    private Transaction applyPrediction(Transaction tx, Map<?, ?> result) {
        if (isTrustedCredit(tx)) {
            tx.setFraud_probability(0);
            tx.setIs_fraud(0);
            return saveTransaction(tx);
        }

        tx.setFraud_probability(asDouble(result.get("fraud_probability")));
        tx.setIs_fraud(asInt(result.get("is_fraud")));
        return saveTransaction(tx);
    }

    private List<Transaction> scoreWithHeuristics(List<Transaction> transactions) {
        return transactions.stream()
                .map(this::scoreWithHeuristic)
                .collect(Collectors.toList());
    }

    private Transaction scoreWithHeuristic(Transaction tx) {
        if (tx == null) {
            return null;
        }

        if (isTrustedCredit(tx)) {
            tx.setFraud_probability(0);
            tx.setIs_fraud(0);
            return saveTransaction(tx);
        }

        double probability = 0.05;
        double avgAmount = tx.getAvg_amount() > 0 ? tx.getAvg_amount() : Math.max(tx.getAmount(), 1);
        double balance = tx.getBalance() > 0 ? tx.getBalance() : Math.max(tx.getAmount(), 1);

        if (tx.getIsForeign() == 1) {
            probability += 0.2;
        }
        if (tx.getIsHighRisk() == 1) {
            probability += 0.2;
        }
        if (tx.getHour() < 6 || tx.getHour() > 22) {
            probability += 0.1;
        }
        if (tx.getAmount() > avgAmount * 3) {
            probability += 0.2;
        }
        if (tx.getAmount() > balance * 1.2) {
            probability += 0.2;
        }
        if (tx.getAmount() > avgAmount * 5) {
            probability += 0.1;
        }

        probability = Math.min(probability, 0.99);
        tx.setFraud_probability(probability);
        tx.setIs_fraud(probability >= heuristicThreshold ? 1 : 0);
        return saveTransaction(tx);
    }

    private boolean isTrustedCredit(Transaction tx) {
        return tx != null && ("BANK".equals(tx.getSenderAccount()) || "RAZORPAY_TOPUP".equals(tx.getSenderAccount()));
    }

    private double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return 0;
    }

    private int asInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAllTransactions().stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .collect(Collectors.toList());
    }
}
