package com.mensalito.api.util;

public final class DocumentUtils {

    private DocumentUtils() {}

    public static String normalize(String document) {
        if (document == null || document.isBlank()) return null;
        String digits = document.replaceAll("\\D", "");
        return digits.isEmpty() ? null : digits;
    }

    public static String format(String document) {
        String d = normalize(document);
        if (d == null) return null;

        return switch (d.length()) {
            case 11 -> formatCpf(d);
            case 14 -> formatCnpj(d);
            default -> d;
        };
    }

    public static boolean isValid(String document) {
        String d = normalize(document);
        return d != null && (d.length() == 11 || d.length() == 14);
    }

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
