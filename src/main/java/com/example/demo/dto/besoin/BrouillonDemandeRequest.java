package com.example.demo.dto.besoin;

import java.util.Map;

public record BrouillonDemandeRequest(Long id, Map<String, Object> donnees) {
}
