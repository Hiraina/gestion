package com.example.demo.controller;

import com.example.demo.entity.contrat.ContratTravail;
import com.example.demo.service.contrat.ContratTravailService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/contrats")
public class ContratTravailController {

    private final ContratTravailService service;

    public ContratTravailController(ContratTravailService service) {
        this.service = service;
    }

    @GetMapping
    public List<ContratTravail> lister() {
        return service.lister();
    }
}
