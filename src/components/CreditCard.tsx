//@ts-nocheck

import { useEffect, useState } from "react";
import { getInstallments, createCardToken } from "@mercadopago/sdk-react/coreMethods";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField, Typography } from "@mui/material";
import { Installments } from "@mercadopago/sdk-react/coreMethods/getInstallments/types";
import ReactInputMask from "react-input-mask";
import { createPayment } from "../modules/api/FarmBank";

const AMOUNT = import.meta.env.VITE_CREDIT_CARD_AMOUNT

interface CreditCardProps {
  email: string;
  phoneNumber: string;
  handleRootError: () => boolean;
}

const CreditCard = ({ email, handleRootError, phoneNumber }: CreditCardProps) => {

  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardNumberError, setCardNumberError] = useState<boolean>(false);
  const [validCard, setValidCard] = useState<boolean>(true);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [expirationDateError, setExpirationDateError] = useState<boolean>(false);
  const [cod, setCod] = useState<string>('');
  const [codError, setCodError] = useState<boolean>(false);
  const [cardName, setCardName] = useState<string>('');
  const [cardNameError, setCardNameError] = useState<boolean>(false);
  const [installments, setInstallments] = useState<Installments>();
  const [selectedInstallment, setSelectedInstallment] = useState<number>();
  const [issuerId, setIssuerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const paymentMutation = createPayment()

  useEffect(() => {
    if (installments == undefined && cardNumber.replaceAll(" ", "").length >= 6) {
      const fetchData = async () => {
        try {
          const response = await getInstallments({
            amount: AMOUNT,
            bin: cardNumber.replaceAll(" ", "").slice(0, 6)
          });
          const creditCardInstallments = response?.filter(installment => installment.payment_type_id === 'credit_card')[0];
          setInstallments(creditCardInstallments);
          const issuer = creditCardInstallments?.issuer.id.toString() ?? '';
          setIssuerId(issuer);
          setPaymentMethod(creditCardInstallments?.payment_method_id ?? '');
          setValidCard(true);
        }
        catch (error) {
          setInstallments(undefined);
          setValidCard(false);
        }
      }
      fetchData()
    } 
    else if (cardNumber.replaceAll(" ", "").length < 6) {
      setInstallments(undefined);
    }
  }, [cardNumber])

  const handleSelectedInstallment = (e: SelectChangeEvent<number>) => {
    setSelectedInstallment(e.target.value as number);
  }

  const handleSubmit = async () => {
    let hasError = handleRootError()

    if (cardNumber.replaceAll(" ", "").length < 16) {
      setCardNumberError(true)
      hasError = true
    }
    else setCardNumberError(false)
    if (expirationDate.replaceAll(" ", "").length < 7) {
      setExpirationDateError(true)
      hasError = true
    }
    else setExpirationDateError(false)
    if (cod.replaceAll(" ", "").length < 3) {
      setCodError(true)
      hasError = true
    }
    else setCodError(false)
    if (cardName.length < 6) {
      setCardNameError(true)
      hasError = true
    }
    else setCardNameError(false)
    if (installments == undefined) hasError = true

    if (!hasError) {
      const token = await createCardToken({
        cardholderName: cardName,
        cardNumber: cardNumber.replaceAll(" ", ""),
        cardExpirationMonth: expirationDate.split("/")[0],
        cardExpirationYear: expirationDate.split("/")[1],
        securityCode: cod
      })

      let phone: string = phoneNumber.replaceAll(" ", "",).replace("+55", "")
      paymentMutation.mutate({
        amount: parseFloat(AMOUNT),
        email: email,
        phoneNumber: phone,
        paymentMethod: paymentMethod,
        installments: selectedInstallment,
        token: token?.id,
        issuerId: issuerId
      })
    }
  }

  return (
    <>
      <Box display={"flex"} flexDirection={"row"} gap={1}>
        <Typography variant="button" color={"darkviolet"}>
          R$ {AMOUNT}
        </Typography>
        <Typography variant="button">
          em até 12x (com juros)
        </Typography>
      </Box>
      <ReactInputMask
        mask="9999 9999 9999 9999"
        disabled={false}
        maskChar=" "
        onChange={e => setCardNumber(e.target.value)}
      >
        {() => <TextField
          variant="outlined"
          label="Número do cartão"
          placeholder="0000 0000 0000 0000"
          InputLabelProps={{ shrink: true }}
          error={cardNumberError || !validCard}
          helperText={cardNumberError ? "Informe um numero válido" : null}
          sx={{ minWidth: '19rem' }} />}
      </ReactInputMask>
      <ReactInputMask
        mask="99/9999"
        disabled={false}
        maskChar=" "
        onChange={e => setExpirationDate(e.target.value)}
      >
        {() => <TextField
          label="Expiração"
          placeholder="MM/AAAA"
          variant="outlined"
          size="small"
          InputLabelProps={{ shrink: true }}
          error={expirationDateError}
          helperText={expirationDateError ? "Informe uma data válida" : null}
          sx={{ minWidth: '19rem' }} />}
      </ReactInputMask>
      <ReactInputMask
        mask="999"
        disabled={false}
        maskChar=" "
        onChange={e => setCod(e.target.value)}
      >
        {() => <TextField
          label="Código de segurança"
          placeholder="123"
          variant="outlined"
          size="small"
          error={codError}
          helperText={codError ? "Informe um código válido" : null}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: '19rem' }} />}
      </ReactInputMask>
      <TextField
        label="Nome no cartão"
        placeholder="Maria Joaquina"
        variant="outlined"
        size="small"
        onChange={e => setCardName(e.target.value)}
        error={cardNameError}
        helperText={cardNameError ? "Informe um nome válido" : null}
        InputLabelProps={{ shrink: true }}
        sx={{ minWidth: '19rem' }} />
      <FormControl fullWidth>
        <InputLabel id="payment-method-label">Forma de Pagamento</InputLabel>
        <Select
          disabled={installments == undefined}
          labelId="payment-method-label"
          label="Forma de Pagamento"
          value={selectedInstallment}
          onChange={handleSelectedInstallment}
        >
          {installments?.payer_costs.map(installment => (
            <MenuItem value={installment.installments}>{installment.recommended_message}</MenuItem>
          ))
          }
        </Select>
      </FormControl>
      <Button variant="contained" color="secondary" onClick={handleSubmit}>Confirmar Pagamento</Button>
    </>
  );
};

export default CreditCard