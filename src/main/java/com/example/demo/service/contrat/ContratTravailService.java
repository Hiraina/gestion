package com.example.demo.service.contrat;

import com.example.demo.entity.contrat.ContratTravail;
import com.example.demo.repository.contrat.CandidatContratRepository;
import com.example.demo.repository.contrat.ContratTravailRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ContratTravailService {

    private final ContratTravailRepository repository;
    private final CandidatContratRepository candidatRepository;
    private final ObjectMapper objectMapper;

    public ContratTravailService(ContratTravailRepository repository, CandidatContratRepository candidatRepository,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.candidatRepository = candidatRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ContratTravail> lister() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listerCandidatsAcceptes() {
        return candidatRepository.listerCandidatsAcceptes().stream().map(row -> {
            Map<String, Object> result = new java.util.LinkedHashMap<>(row);
            Object rawDescription = result.remove("offerDescription");
            Map<String, Object> data = extraireDonneesOffre(rawDescription);
            result.put("contractType", data.get("contract"));
            result.put("companyName", data.get("company"));
            return result;
        }).toList();
    }

    @Transactional
    public boolean embaucherCandidat(int candidatureId) {
        if (candidatureId <= 0) {
            throw new IllegalArgumentException("Identifiant de candidature invalide.");
        }
        return candidatRepository.embaucherCandidat(candidatureId);
    }

    private Map<String, Object> extraireDonneesOffre(Object rawDescription) {
        String prefix = "RH-OFFRE-JSON-V1:";
        if (!(rawDescription instanceof String description) || !description.startsWith(prefix)) return Map.of();
        try {
            Map<String, Object> envelope = objectMapper.readValue(description.substring(prefix.length()), new TypeReference<>() {});
            Object data = envelope.get("data");
            if (data instanceof Map<?, ?> values) {
                Map<String, Object> result = new java.util.LinkedHashMap<>();
                values.forEach((key, value) -> { if (key instanceof String text) result.put(text, value); });
                return result;
            }
        } catch (Exception ignored) {
            // Les descriptions historiques ou invalides n'empêchent pas l'affichage des candidats.
        }
        return Map.of();
    }
}
