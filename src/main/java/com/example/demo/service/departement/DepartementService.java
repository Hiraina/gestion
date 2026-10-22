package com.example.demo.service.departement;

import com.example.demo.dto.departement.DepartementDTO;
import com.example.demo.entity.departement.Departement;
import com.example.demo.repository.departement.DepartementRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DepartementService {

	private final DepartementRepository repository;

	public DepartementService(DepartementRepository repository) {
		this.repository = repository;
	}

	public List<DepartementDTO> listerTous() {
		return repository.findAllByOrderByNomAsc().stream()
				.map(DepartementDTO::new)
				.collect(Collectors.toList());
	}
}
