package com.example.demo.service.contrat;

import com.example.demo.entity.contrat.ContratTravail;
import com.example.demo.repository.contrat.CandidatContratRepository;
import com.example.demo.repository.contrat.ContratTravailRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class ContratTravailService {

    private final ContratTravailRepository repository;
    private final CandidatContratRepository candidatRepository;

    public ContratTravailService(ContratTravailRepository repository, CandidatContratRepository candidatRepository) {
        this.repository = repository;
        this.candidatRepository = candidatRepository;
    }

    @Transactional(readOnly = true)
    public List<ContratTravail> lister() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listerCandidatsAcceptes() {
        return candidatRepository.listerCandidatsAcceptes();
    }
}
