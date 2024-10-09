$(document).ready(function() {

    // variables

    const currentDate = new Date();

    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth() + 1;

    let _paymentId;

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // helpers

    function formatMask(element, mode) {
        if (mode == 'currency') {
            return $(element).mask('000.000.000,00', { reverse: true });
        }
        if (mode == 'date') {
            return $(element).mask('00/00/0000');
        }
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    function convertToFloat(value) {
        let _sanitizedValue = value.replace(/\./g, '');
        _sanitizedValue = _sanitizedValue.replace(/,/g, '.');
        return parseFloat(_sanitizedValue);
    }

    function handleInstallments(method, installments) {
        $(method).change(function() {
            if ($(method).val() == 'Debit') {
                $(installments).attr('disabled', true);
                $(installments).val('');
            } else {
                $(installments).attr('disabled', false);
                $(installments).val(1);
            }
        });
    }

    function handleValue(element) {
        $(element).on('focusout', function() {
            if (!$(this).val().includes(',')) {
                $(this).val($(this).val() + ',00');
            }
            if ($(this).val() == ',00' || $(this).val() == 0) {
                $(this).val('');
            }
        });
    }

    function formatSearchTerm(_term) {
        return _term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }

    // api functions

    async function loadCategories(element) {

        await $.get('/categories', function(data) {
            $(element).empty();
            data.forEach(category => {
                $(element).append(`<option value="${category.alias}">${category.name}</option>`);
            });
        });

    }

    async function loadInstitutions(element) {

        await $.get('/institutions', function(data) {

            $(element).empty();

            data.forEach(institution => {
                $(element).append(`<option value="${institution.alias}">${institution.name}</option>`);
            });

        });

    }

    async function loadPayments(year, month) {

        let _amountMonth = 0.00;

        $('#current-month').text(`${monthNames[month - 1]} - ${year}`);

        await $.get(`/payments/${year}/${month}`, function(data) {

            $('#payments-table-body').empty();

            data.forEach(payment => {

                $('#payments-table-body').append(`

                    <tr class="text-blue-700" data-id="${payment.id}">

                        <td class="flex justify-center w-100 p-2" data-alias="${payment.category_alias}">
                            <p>${payment.category_name}</p>
                        </td>

                        <td class="p-2">
                            ${payment.date}
                        </td>

                        <td class="p-2" data-float="${payment.value}">
                            ${formatCurrency(payment.value)}
                        </td>

                        <td class="p-2" data-alias="${payment.institution_alias}">
                            ${payment.institution_name}
                        </td>

                        <td class="p-2">
                            ${payment.method}
                        </td>

                        <td class="p-2">
                            ${payment.installments == 0 ? '-' : payment.installments}
                        </td>

                        <td class="p-2 text-ellipsis text-nowrap">
                            ${payment.description == 0 ? '-' : payment.description}
                        </td>

                    </tr>

                `);

            });

        });

        $('#payments-table-body tr').each(function() {

            let _value = $(this).find('td').eq(2).data('float');
            let _method = $(this).find('td').eq(4).text().trim();
            let _installments = $(this).find('td').eq(5).text().trim();

            if ((_method == 'Debit') || (_method == 'Credit' && _installments.includes('/'))) {
                _amountMonth += _value;
            }

            if (_installments.includes('/')) {
                $(this).addClass('text-gray-600');
            }

        });

        $('#amount-month').text(formatCurrency(_amountMonth));

    }

    // modal

    function openModal(modalId) {
        $(modalId).removeClass('hidden');
    }

    function closeModal(modalId) {
        $(modalId).addClass('hidden');
        $(modalId).find('input').val('')
    }

    $('#open-payment-modal').click(async function(event) {

        await loadCategories('#category');
        await loadInstitutions('#institution');

        formatMask('#date', 'date');
        formatMask('#value', 'currency');

        handleValue('#value')
        handleInstallments('#method', '#installments');

        $('#method').trigger('change');

        openModal('#payment-modal');

    });

    $('#open-category-modal').click(function(event) {
        openModal('#category-modal');
    });

    $('#open-institution-modal').click(function(event) {
        openModal('#institution-modal');
    });

    $('#payments-table-body').on('click', 'tr', async function() {

        _paymentId = $(this).data('id');

        let _paymentDate = $(this).find('td').eq(1).text().trim();
        let _paymentInstallments = $(this).find('td').eq(5).text().trim();

        if (_paymentInstallments.includes('/')) {
            currentYear = parseInt(_paymentDate.split('/')[2]);
            currentMonth = parseInt(_paymentDate.split('/')[1]);
            return loadPayments(currentYear, currentMonth);
        }

        await loadCategories('#edit-category');
        await loadInstitutions('#edit-institution');

        await $.get(`/payment/${_paymentId}`, function(payment) {
            $('#edit-category').val(payment.category_alias);
            $('#edit-date').val(payment.date);
            $('#edit-value').val(formatCurrency(payment.value));
            $('#edit-institution').val(payment.institution_alias);
            $('#edit-method').val(payment.method);
            $('#edit-installments').val(payment.installments);
            $('#edit-description').val(payment.description);
        });

        formatMask('#edit-date', 'date');
        formatMask('#edit-value', 'currency');

        handleValue('#edit-value');
        handleInstallments('#edit-method', '#edit-installments');

        openModal('#edit-payment-modal');

    });

    $('#close-payment-modal').click(function() {
        closeModal('#payment-modal');
    });

    $('#close-category-modal').click(function() {
        closeModal('#category-modal');
    });

    $('#close-institution-modal').click(function() {
        closeModal('#institution-modal');
    });

    $('#close-edit-payment-modal').click(function() {
        closeModal('#edit-payment-modal');
    });

    // forms

    $('#payment-form').submit(function(event) {

        event.preventDefault();

        let _form_invalid = false;

        $(this).find('input', 'select').each(function() {

            let _id = $(this).attr('id');

            if (_id !== 'description' && _id !== 'installments' && !$(this).hasClass('qs-overlay-year')) {

                if (!$(this).val()) {
                    $(this).addClass('is-invalid');
                    _form_invalid = true;
                } else {
                    $(this).removeClass('is-invalid');
                }

            }

        });

        if (_form_invalid) return false;

        const data = {
            category: $('#category').val(),
            date: $('#date').val(),
            value: $('#value').val(),
            institution: $('#institution').val(),
            method: $('#method').val(),
            installments: parseInt($('#installments').val()),
            description: $('#description').val()
        };

        $.ajax({
            type: 'POST',
            url: '/payments',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                loadPayments(currentYear, currentMonth);
                $('#payment-form')[0].reset();
            }
        });

        closeModal('#payment-modal');

    });

    $('#category-form').submit(function(event) {

        event.preventDefault();

        const data = {
            name: $('#category-name').val(),
        };

        $.ajax({
            type: 'POST',
            url: '/categories',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                loadCategories('#category');
                closeModal('#category-modal');
            }
        });

    });

    $('#institution-form').submit(function(event) {

        event.preventDefault();

        const data = {
            name: $('#institution-name').val(),
        };

        $.ajax({
            type: 'POST',
            url: '/institutions',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                loadInstitutions('#institution');
                closeModal('#institution-modal');
            }
        });

    });

    $('#edit-payment-form').submit(function(event) {

        event.preventDefault();

        const data = {
            category: $('#edit-category').val(),
            institution: $('#edit-institution').val(),
            date: $('#edit-date').val(),
            value: convertToFloat($('#edit-value').val()),
            method: $('#edit-method').val(),
            installments: $('#edit-installments').val(),
            description: $('#edit-description').val(),
        };

        $.ajax({
            type: 'PUT',
            url: `/payment/${_paymentId}`,
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function() {
                loadPayments(currentYear, currentMonth);
                closeModal('#edit-payment-modal');
            }
        });

    });

    $('#delete-payment').on('click', function() {

        $.ajax({
            type: 'DELETE',
            url: `/payment/${_paymentId}`,
            contentType: 'application/json',
            success: function() {
                loadPayments(currentYear, currentMonth);
                closeModal('#edit-payment-modal');
            }
        });

    }); 

    // mouse and keyboard events

    $('#prev-month').click(function() {
        if (currentMonth === 1) {
            currentMonth = 12;
            currentYear--;
        } else {
            currentMonth--;
        }
        loadPayments(currentYear, currentMonth);
    });

    $('#next-month').click(function() {
        if (currentMonth === 12) {
            currentMonth = 1;
            currentYear++;
        } else {
            currentMonth++;
        }
        loadPayments(currentYear, currentMonth);
    });

    $('#payment-filter-value').on('input', function() {
        let _has_term = $(this).val() ? true : false;
        $('#payment-filter-clear').attr('hidden', !_has_term);
    });

    $('#payment-filter-search').click(function() {

        let _filter_value = $('#payment-filter-value').val();

        let _amountMonth = 0.00;

        $('#payments-table-body tr').each(function() {

            let _value = $(this).find('td').eq(2).data('float');
            let _method = $(this).find('td').eq(4).text().trim();
            let _installments = $(this).find('td').eq(5).text().trim();

            if (_filter_value) {
                let _hide_line = formatSearchTerm($(this).text()).includes(formatSearchTerm(_filter_value)) ? false : true;
                $(this).attr('hidden', _hide_line);
                $('#payment-filter-clear').attr('hidden', false);
            } else {
                $(this).attr('hidden', false);
                $('#payment-filter-clear').attr('hidden', true);
            }

            if ($(this).attr('hidden') === undefined && ((_method == 'Debit') || (_method == 'Credit' && _installments.includes('/')))) {
                _amountMonth += _value;
            }   

        });

        
        $('#amount-month').text(formatCurrency(_amountMonth));

    });

    $('#payment-filter-clear').click(function() {

        let _amountMonth = 0.00;

        $(this).attr('hidden', true);

        $('#payment-filter-value').val('');

        $('#payments-table-body tr').each(function() {

            $(this).attr('hidden', false);

            let _value = $(this).find('td').eq(2).data('float');
            let _method = $(this).find('td').eq(4).text().trim();
            let _installments = $(this).find('td').eq(5).text().trim();

            if ((_method == 'Debit') || (_method == 'Credit' && _installments.includes('/'))) {
                _amountMonth += _value;
            }

        });

        $('#amount-month').text(formatCurrency(_amountMonth));

    });

    $('#payment-filter-date-button').click(function() {

        let _year = $('#payments-year-value').val();
        let _month = $('#payments-month-value').val();

        if (_year && _month) {

            currentYear = _year;
            currentMonth = _month;
    
            loadPayments(currentYear, currentMonth);

        }

    });

    $('#hide-form').click(function() {

        let _form_card = $('#payment-form').closest('.card');

        let _form_is_hidden = _form_card.attr('hidden') == undefined ? false : true;

        _form_card.attr('hidden', !_form_is_hidden);

    });

    $(document).keydown(function(event) {

        if (!$('input').is(':focus')) {

            if (event.keyCode == 37) {
                $('#prev-month').trigger('click');
            }

            if (event.keyCode == 39) {
                $('#next-month').trigger('click');
            }

            if (event.keyCode == 72) {

                let _form_card = $('#payment-form').closest('.card');

                let _form_is_hidden = _form_card.attr('hidden') == undefined ? false : true;

                _form_card.attr('hidden', !_form_is_hidden);

            }

        }

    });

    $(document).on('wheel', function(event) {
        if ($('.card-header')[0].contains(event.target) && !$('input').is(':focus')) {
            if (event.originalEvent.deltaY < 0) {
                $('#next-month').trigger('click');
            } else if (event.originalEvent.deltaY > 0) {
                $('#prev-month').trigger('click');
            }
        }
    });

    // plugins

    function useDatepicker(element) {
        datepicker(element, {
            formatter: (input, date, instance) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                input.value = `${day}/${month}/${year}`;
            },
        });
    }

    // first initialization

    $('input').on('input', function() {
        if ($(this).removeClass('is-invalid'));
    });

    $('#payments-year-value').val(currentYear);
    $('#payments-month-value').val(currentMonth);

    useDatepicker('#date');
    useDatepicker('#edit-date');

    loadPayments(currentYear, currentMonth);

});