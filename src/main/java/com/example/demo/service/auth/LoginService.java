package com.example.demo.service.auth;

import com.example.demo.repository.auth.LoginRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class LoginService {

	private static final Map<String, String> ROLE_VIEWS = Map.of(
			"direction", "Responsable-Direction/template.html",
			"finance", "Responsable-Finance/template.html",
			"manager", "Responsable-Manager/template.html",
			"rh", "Responsable-RH/template.html");

	private final LoginRepository loginRepository;

	public LoginService(LoginRepository loginRepository) {
		this.loginRepository = loginRepository;
	}

	public String authentifier(String email, String password) {
		List<Map<String, Object>> rows = loginRepository.findActifUtilisateurRoles(email);
		for (Map<String, Object> row : rows) {
			if (password.equals(row.get("mot_de_passe_hash"))) {
				String role = String.valueOf(row.get("role")).toLowerCase();
				String view = ROLE_VIEWS.get(role);
				if (view != null) {
					return "redirect:/" + view;
				}
			}
		}
		return "redirect:/login?error";
	}
}
