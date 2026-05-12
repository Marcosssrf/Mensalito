package com.mensalito.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address {

    @Column(name = "address_zip_code", length = 10)
    private String zipCode;

    @Column(name = "address_street")
    private String street;

    @Column(name = "address_number", length = 20)
    private String number;

    @Column(name = "address_complement")
    private String complement;

    @Column(name = "address_neighborhood")
    private String neighborhood;

    @Column(name = "address_city")
    private String city;

    @Column(name = "address_state", length = 2)
    private String state;
}
