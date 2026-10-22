package com.example.demo.repository.poste;

import com.example.demo.entity.poste.Poste;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PosteRepository extends JpaRepository<Poste, Integer> {

	List<Poste> findAllByOrderByTitreAsc();
}
