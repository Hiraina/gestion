package com.example.demo.service.offre;

import com.example.demo.repository.offre.TypeContratRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class TypeContratService {

	private final TypeContratRepository repository;

	public TypeContratService(TypeContratRepository repository) {
		this.repository = repository;
	}

	public List<String> listerTous() {
		return repository.listerLibelles();
	}
}
