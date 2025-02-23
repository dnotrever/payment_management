$(document).ready(function() {

    //-------|  V A R I A B L E S

    const currentDate = new Date();

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth() + 1;

    let _paymentId;

    function bodyPaymentsList(payment) {

        return `
            <tr class="text-blue-700" data-id="${payment.id}">
                <td class="flex justify-center w-100 p-2" data-alias="${payment.category_alias}"><p>${payment.category_name}</p></td>
                <td class="p-2">${payment.date}</td>
                <td class="p-2" data-float="${payment.value}">${formatCurrency(payment.value)}</td>
                <td class="p-2" data-alias="${payment.institution_alias}">${payment.institution_name}</td>
                <td class="p-2">${payment.method}</td>
                <td class="p-2">${payment.installments == 0 ? '-' : payment.installments}</td>
                <td class="p-2 text-ellipsis text-nowrap">${payment.description == 0 ? '-' : payment.description}</td>
            </tr>
        `
        
    }


    //-------|  H E L P E R S

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

    function formatSearchTerm(term) {
        return term.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }

    function compareTwoDates(date1, date2, comparison='menorIgual') {
        const [day1, month1, year1] = date1.split('/').map(Number);
        const [day2, month2, year2] = date2.split('/').map(Number);
        const dateObj1 = new Date(year1, month1 - 1, day1);
        const dateObj2 = new Date(year2, month2 - 1, day2);
        let _comparisons = {
            igual: dateObj1 == dateObj2,
            menorIgual: dateObj1 <= dateObj2,
        }
        return _comparisons[comparison];
    }

    // toast messsages
    function toast(message = '', status = 'load', { close = true, duration = 10000 } = {}) {

        let _toastContainer = $('.toast-container');
        let _toast = $('.toast');
        let _message = _toast.find('.toast-message');
        let _btnClose = _toast.find('.btn-close');

        let _statusClasses = {
            load: 'bg-blue-800',
            success: 'bg-green-700',
            error: 'bg-red-700',
            info: 'bg-blue-700',
        }

        if (status == 'load') {
            _message.before('<i class="fa fa-spinner text-white me-3 fs-4 animate-spin"></i>');
        } else {
            _message.prev().remove();
        }

        _btnClose.prop('hidden', (!close || status == 'load'));

        _toast.removeClass(function(index, className) { return (className.match(/\bbg-\S+/g) || []).join(' '); });
        _toast.addClass(_statusClasses[status] || _statusClasses['info']);

        _message.text(message);

        _toastContainer.prop('hidden', false);

        const toastInstance = new bootstrap.Toast(_toast[0], { autohide: false });
        toastInstance.show();

        if (duration > 0 && status !== 'load') {
            setTimeout(() => _toast.toast('hide'), duration);
        }

    }

    //
    function paymentFields(element) {

        return {
            category: element.find('td').eq(0).text().trim(),
            date: element.find('td').eq(1).text().trim(),
            value: element.find('td').eq(2).data('float'),
            institution: element.find('td').eq(3).text().trim(),
            method: element.find('td').eq(4).text().trim(),
            installments: element.find('td').eq(5).text().trim(),
            description: element.find('td').eq(6).text().trim(),
        }

    }

    // critério para itaú crédito
    function itauCondition(date, institution, method) {

        let _itauCondition = (
            institution == 'Itaú' &&
            method == 'Credit' &&
            (compareTwoDates(date, `10/${currentMonth}/${currentYear}`))
        );

        return _itauCondition;

    }

    // verifica se o pagamento é debito ou crédito do mês corrente
    function debitOrCreditCurrent(date, institution, method, installments) {

        return ((method == 'Debit') || (method == 'Credit' && installments.includes('/')) || itauCondition(date, institution, method))

    }


    //-------|  A P I   F U N C T I O N S

    async function loadCategories(element) {

        await $.get('/categories', function(data) {
            $(element).empty();
            data.forEach(category => {
                $(element).append(`<option value="${category.alias}" ${category.alias == 'supermercado' ? 'selected' : ''}>${category.name}</option>`);
            });
        });

    }

    async function loadInstitutions(element) {

        await $.get('/institutions', function(data) {

            $(element).empty();

            data.forEach(institution => {
                $(element).append(`<option value="${institution.alias}" ${institution.alias == 'itau' ? 'selected' : ''}>${institution.name}</option>`);
            });

        });

    }

    async function loadPayments(year, month) {

        let _amountMonth = 0.00;

        $('#current-month').text(`${monthNames[month - 1]} - ${year}`);

        await $.get(`/payments/${year}/${month}`, function(data) {

            $('#payments-table-body').empty();

            data.forEach(payment => {
                $('#payments-table-body').append(bodyPaymentsList(payment));
            });

        });

        $('#payments-table-body tr').each(function() {

            let { category, date, value, institution, method, installments, description } = paymentFields($(this));

            if (debitOrCreditCurrent(date, institution, method, installments)) {
                _amountMonth += value;
            }

            let _itauCondition = itauCondition(date, institution, method);

            if (installments.includes('/')) {
                $(this).removeClass('text-blue-700').addClass('text-red-500');
            } else if (!installments.includes('-') && !_itauCondition) {
                $(this).removeClass('text-blue-700').addClass('text-gray-500');
            }

        });

        $('#amount-month').text(formatCurrency(_amountMonth));

        if ($('#payment-filter-value').val() != '') {
            $('#payment-filter-search').trigger('click'); 
        }

    }

    async function updateSpreadSheets(date, method) {

        toast('Updating Spreadsheets...', 'load');

        let _month = date ? parseInt(date.split('/')[1]) : parseInt(currentMonth);
        let _year = date ? date.split('/')[2] : currentYear;
        
        let _supermercadoAmount = 0.00;
        let _outrosAmount = 0.00;

        $('#payments-table-body tr').each(function() {

            let { category, date, value, institution, method, installments, description } = paymentFields($(this));

            if (category.toLowerCase() == 'supermercado' && debitOrCreditCurrent(date, institution, method, installments)) {
                _supermercadoAmount += value;
            }

            if (description.toLowerCase() == 'outros' && debitOrCreditCurrent(date, institution, method, installments)) {
                _outrosAmount += value;
            } 
            
        });

        let _data = {
            'method': method,
            'month': _month,
            'year': _year,
            'supermercado': parseFloat(_supermercadoAmount),
            'outros': parseFloat(_outrosAmount),
        };

        $.get('/update-spreadsheets', _data, function(data) {

            let _status = data.success ? 'success' : 'error';

            toast(data.message, _status)
            
        });

    }


    //-------|  M O D A L

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
        $('#description').prop('disabled', false);

        openModal('#payment-modal');

    });

    $('#open-category-modal').click(function(event) {
        openModal('#category-modal');
    });

    $('#open-institution-modal').click(function(event) {
        openModal('#institution-modal');
    });

    // abre o modal de um pagamento (para edição ou exclusão)
    $('#payments-table-body').on('click', 'tr', async function() {

        _paymentId = $(this).data('id');

        let { category, date, value, institution, method, installments, description } = paymentFields($(this));

        let _itauCondition = itauCondition(date, institution, method);

        let _currentDate = (currentMonth.toString().padStart(2, '0') + '/' + currentYear).trim();
        let _paymentDateFormatted = (date.substring(3)).trim();
        let _isSameDate = _currentDate.includes(_paymentDateFormatted);

        if ( (installments.includes('/') || !_itauCondition) && !_isSameDate) {
            currentYear = parseInt(date.split('/')[2]);
            currentMonth = parseInt(date.split('/')[1]);
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
            if (payment.method == 'Credit') $('#edit-installments').val(payment.installments);
            $('#edit-description').val(payment.description);
        });

        let _isDebit = $('#edit-method').val() == 'Debit';
        $('#edit-installments').attr('disabled', _isDebit);

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


    //-------|  F O R M S

    // insert payment
    $('#payment-form').submit(function(event) {

        toast('Inserting payment...', 'load');

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

        if (_form_invalid) {
            return toast('The form is invalid.', 'error');
        }

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
            success: async function() {
                await loadPayments(currentYear, currentMonth);
                $('#payment-form')[0].reset();
                updateSpreadSheets(data.date, data.method);
                toast('Payment inserted successfully!', 'success');
            }
        });

        closeModal('#payment-modal');

    });

    // insert category
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

    // insert institution
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

    // update payment
    $('#edit-payment-form').submit(function(event) {

        toast('Updating payment...', 'load');

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
            success: async function() {
                await loadPayments(currentYear, currentMonth);
                updateSpreadSheets(data.date, data.method);
                toast('Payment inserted successfully!', 'success');
            }
        });

        closeModal('#edit-payment-modal');

    });

    // delete payment
    $('#delete-payment').on('click', function() {

        toast('Deleting payment...', 'load');

        let _date = $(this).closest('#edit-payment-modal').find('#edit-date').val();
        let _method = $(this).closest('#edit-payment-modal').find('#edit-method').val();

        $.ajax({
            type: 'DELETE',
            url: `/payment/${_paymentId}`,
            contentType: 'application/json',
            success: async function() {
                await loadPayments(currentYear, currentMonth);
                updateSpreadSheets(_date, _method);
                toast('Payment deleted successfully!', 'success');
            }
        });

        closeModal('#edit-payment-modal');

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

    // mostra ou esconde botão de limpar caixa de filtro conforme usuário digita
    $('#payment-filter-value').on('input', function() {
        let _has_term = $(this).val() ? true : false;
        $('#payment-filter-clear').attr('hidden', !_has_term);
    });

    $('#payment-filter-search').click(function() {

        let _filter_value = $('#payment-filter-value').val();

        let _amountMonth = 0.00;

        $('#payments-table-body tr').each(function() {

            let { category, date, value, institution, method, installments, description } = paymentFields($(this));

            if (_filter_value) {

                let _line_text = $(this).text();
                let _terms = _filter_value.split(';');
                let _filter_check = 0;

                _terms.forEach(function(element) {
                    if (formatSearchTerm(_line_text).includes(formatSearchTerm(element)))
                        _filter_check += 1;
                })
                
                let _hide_line = (_filter_check >= _terms.length && debitOrCreditCurrent(date, institution, method, installments)) ? false : true;

                $(this).attr('hidden', _hide_line);
                    
                $('#payment-filter-clear').attr('hidden', false);

            } else {
                $(this).attr('hidden', false);
                $('#payment-filter-clear').attr('hidden', true);
            }

            if ($(this).attr('hidden') === undefined && debitOrCreditCurrent(date, institution, method, installments)) {
                _amountMonth += value;
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

            let { category, date, value, institution, method, installments, description } = paymentFields($(this));

            if (debitOrCreditCurrent(date, institution, method, installments)) {
                _amountMonth += value;
            }

        });

        $('#amount-month').text(formatCurrency(_amountMonth));

    });

    $('#payment-filter-date-button').click(async function() {

        let _year = $('#payments-year-value').val();
        let _month = $('#payments-month-value').val();

        if (_year && _month) {

            currentYear = _year;
            currentMonth = _month;
    
            await loadPayments(currentYear, currentMonth);

        }

    });

    $('#hide-form').click(function() {

        let _form_card = $('#payment-form').closest('.card');

        let _form_is_hidden = _form_card.attr('hidden') == undefined ? false : true;

        _form_card.attr('hidden', !_form_is_hidden);

    });

    $('#category').on('change', function() {
        let _category = $(this).val();
        let _categories = ['supermercado', 'aluguel', 'internet', 'light', 'agua'];
        if (!_categories.includes(_category)) {
            $('#description').val('Outros');
            $('#description').prop('disabled', true);
        } else {
            $('#description').val('');
            $('#description').prop('disabled', false);
        }
    });

    $('#payment-database').on('change', function() {

        // const data = {
        //     db_name: $(this).val()
        // };

        // $.ajax({
        //     type: 'POST',
        //     url: '/change-database',
        //     contentType: 'application/json',
        //     data: JSON.stringify(data),
        //     success: async function() {
        //         await loadPayments(currentYear, currentMonth);
        //         toast('The database has been changed.', 'success');
        //     }
        // });

        location.reload();

    });

    $('#update-spreadsheets').on('click', async function() {

        await updateSpreadSheets(`01/${currentMonth}/${currentYear}`, 'Debit');

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


    //-------|  P L U G I N S

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


    //-------|  F I R S T   I N I T I A L I Z A T I O N

    $('input').on('input', function() {
        if ($(this).removeClass('is-invalid'));
    });

    $('#payments-year-value').val(currentYear);
    $('#payments-month-value').val(currentMonth);

    useDatepicker('#date');
    useDatepicker('#edit-date');

    loadPayments(currentYear, currentMonth);

});