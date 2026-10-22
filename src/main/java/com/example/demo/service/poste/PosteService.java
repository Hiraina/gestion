package com.example.demo.service.poste;

import com.example.demo.dto.poste.PosteDTO;
import com.example.demo.entity.poste.Poste;
import com.example.demo.repository.poste.PosteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PosteService {

	private final PosteRepository repository;

	public PosteService(PosteRepository repository) {
		this.repository = repository;
	}

	public List<PosteDTO> listerTous() {
		return repository.findAllByOrderByTitreAsc().stream()
				.map(PosteDTO::new)
				.collect(Collectors.toList());
	}
}
