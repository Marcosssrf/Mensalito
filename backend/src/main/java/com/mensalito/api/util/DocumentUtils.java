package com.mensalito.api.util;

/**
 * Utilitário para padronização de CPF e CNPJ.
 *
 * <p><b>Regra de armazenamento:</b> o banco guarda sempre só os dígitos (sem pontuação).
 * <ul>
 *   <li>CPF  → 11 dígitos: {@code 12345678901}</li>
 *   <li>CNPJ → 14 dígitos: {@code 12345678000190}</li>
 * </ul>
 *
 * <p><b>Regra de exibição:</b> a API formata na saída:
 * <ul>
 *   <li>CPF  → {@code 123.456.789-01}</li>
 *   <li>CNPJ → {@code 12.345.678/0001-90}</li>
 * </ul>
 */
public final class DocumentUtils {

    private DocumentUtils() {}

    /**
     * Remove toda pontuação e retorna apenas os dígitos.
     * Retorna {@code null} se a entrada for nula ou vazia.
     */
    public static String normalize(String document) {
        if (document == null || document.isBlank()) return null;
        String digits = document.replaceAll("\\D", "");
        return digits.isEmpty() ? null : digits;
    }

    /**
     * Formata o documento para exibição.
     * Espera receber já normalizado (só dígitos); tolera entrada com pontuação.
     * Retorna {@code null} se a entrada for nula/vazia ou tiver tamanho inválido.
     */
    public static String format(String document) {
        String d = normalize(document);
        if (d == null) return null;

        return switch (d.length()) {
            case 11 -> formatCpf(d);
            case 14 -> formatCnpj(d);
            default -> d; // tamanho inesperado: devolve os dígitos sem formatar
        };
    }

    /** Valida se o documento tem tamanho correto para CPF (11) ou CNPJ (14). */
    public static boolean isValid(String document) {
        String d = normalize(document);
        return d != null && (d.length() == 11 || d.length() == 14);
    }

    // ---------------------------------------------------------------- private

    private static String formatCpf(String d) {
        // 123.456.789-01
        return d.substring(0, 3) + "."
             + d.substring(3, 6) + "."
             + d.substring(6, 9) + "-"
             + d.substring(9);
    }

    private static String formatCnpj(String d) {
        // 12.345.678/0001-90
        return d.substring(0, 2) + "."
             + d.substring(2, 5) + "."
             + d.substring(5, 8) + "/"
             + d.substring(8, 12) + "-"
             + d.substring(12);
    }
}
