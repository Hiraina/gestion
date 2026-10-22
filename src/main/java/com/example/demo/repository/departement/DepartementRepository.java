package com.example.demo.repository.departement;

import com.example.demo.entity.departement.Departement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepartementRepository extends JpaRepository<Departement, Integer> {

	List<Departement> findAllByOrderByNomAsc();
}
