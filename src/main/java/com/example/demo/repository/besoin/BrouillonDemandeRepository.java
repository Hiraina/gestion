package com.example.demo.repository.besoin;

import com.example.demo.entity.besoin.BrouillonDemande;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BrouillonDemandeRepository extends JpaRepository<BrouillonDemande, Long> {
	List<BrouillonDemande> findAllByOrderByDateCreationDesc();
}
