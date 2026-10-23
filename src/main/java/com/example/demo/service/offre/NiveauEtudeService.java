package com.example.demo.service.offre;

import com.example.demo.repository.offre.NiveauEtudeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class NiveauEtudeService {

	private final NiveauEtudeRepository repository;

	public NiveauEtudeService(NiveauEtudeRepository repository) {
		this.repository = repository;
	}

	public List<String> listerTous() {
		return repository.listerLibelles();
	}
}
