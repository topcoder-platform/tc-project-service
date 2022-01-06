import React, { useMemo, useState } from "react";
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardCvcElement,
  CardExpiryElement
} from "@stripe/react-stripe-js";

import useResponsiveFontSize from "../../useResponsiveFontSize";

const useOptions = () => {
  const fontSize = useResponsiveFontSize();
  const options = useMemo(
    () => ({
      style: {
        base: {
          fontSize,
          color: "#424770",
          letterSpacing: "0.025em",
          fontFamily: "Source Code Pro, monospace",
          "::placeholder": {
            color: "#aab7c4"
          }
        },
        invalid: {
          color: "#9e2146"
        }
      }
    }),
    [fontSize]
  );

  return options;
};

const SplitForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const options = useOptions();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [customerPaymentId, setCustomerPaymentId] = useState('');
  const customerToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJ0ZXN0MSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjoiNDAwNTEzMzMiLCJpYXQiOjE0NjMwNzYwODksImVtYWlsIjoidGVzdEB0b3Bjb2Rlci5jb20iLCJqdGkiOiJiMzNiNzdjZC1iNTJlLTQwZmUtODM3ZS1iZWI4ZTBhZTZhNGEifQ.jl6Lp_friVNwEP8nfsfmL-vrQFzOFp2IfM_HC7AwGcg";
  const adminToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiYWRtaW5pc3RyYXRvciJdLCJpc3MiOiJodHRwczovL2FwaS50b3Bjb2Rlci1kZXYuY29tIiwiaGFuZGxlIjoidGVzdDEiLCJleHAiOjI1NjMwNzY2ODksInVzZXJJZCI6IjQwMDUxMzMzIiwiaWF0IjoxNDYzMDc2MDg5LCJlbWFpbCI6InRlc3RAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.wKWUe0-SaiFVN-VR_-GwgFlvWaDkSbc8H55ktb9LAVw";

  const handleSubmit = async event => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }
    setSubmitting(true);
    setPaymentStatus('');

    // Call stripe api the create payment method, so the card info does not pass to our server.
    const payload = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardNumberElement)
    });
    console.log("[PaymentMethod]", payload);
    // Call the server to create the customer payment.
    const response = await fetch(
      "http://localhost:8001/v5/customer-payments",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${customerToken}` },
        body: JSON.stringify({
          amount: event.target.amount.value,
          currency: event.target.currency.value,
          paymentMethodId: payload.paymentMethod.id,
          reference: "project",
          referenceId: "836681",
        }),
      }
    );
    const customerPayment = await response.json();
    setCustomerPaymentId(customerPayment.id)
    console.log("[customerPayment]", customerPayment);

    if (response.status !== 201) {
      // if the response is not 201, then show the error message.
      setMessage(`Error: ${customerPayment.message}`);
    } else if (customerPayment.status === "requires_action") {
      // if the status is requires_action, then call stripe confirm method to show the payment confirmation modal
      // since this step need to interact with user, so we just implement it in frond end.
      const response = await stripe.handleCardAction(
        customerPayment.clientSecret
      );
      if (response.error) {
        setMessage(`Handle card action error: ${response.error.message}`);
      } else {
        const confirmResponse = await fetch(`http://localhost:8001/v5/customer-payments/${customerPayment.id}/confirm`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${customerToken}`},
        });
        const confirmPayment = await confirmResponse.json();
        console.log(confirmPayment)
        setPaymentStatus(confirmPayment.status)
        setMessage(`Current customer payment id: ${confirmPayment.id}, status: ${confirmPayment.status}`);
      }
    } else {
      setPaymentStatus(customerPayment.status)
      // if the status is not requires_action, then show the customer payment id directly.
      setMessage(`Current customer payment id: ${customerPayment.id}, status: ${customerPayment.status}`);
    }
    setSubmitting(false);
  };

  const handleCharge = async event => {
    setPaymentStatus('');
    const response = await fetch(
      `http://localhost:8001/v5/customer-payments/${customerPaymentId}/charge`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    const customerPayment = await response.json();
    setPaymentStatus(customerPayment.status);
    setMessage(
      `Current customer payment id: ${customerPayment.id}, status: ${customerPayment.status}`
    );
  };

  const handleCancel = async event => {
    setPaymentStatus("");
    const response = await fetch(
      `http://localhost:8001/v5/customer-payments/${customerPaymentId}/cancel`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    const customerPayment = await response.json();
    setPaymentStatus(customerPayment.status);
    setMessage(
      `Current customer payment id: ${customerPayment.id}, status: ${customerPayment.status}`
    );
  };

  const handleRefund = async (event) => {
    setPaymentStatus("");
    const response = await fetch(
      `http://localhost:8001/v5/customer-payments/${customerPaymentId}/refund`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );
    const customerPayment = await response.json();
    setPaymentStatus(customerPayment.status);
    setMessage(
      `Current customer payment id: ${customerPayment.id}, status: ${customerPayment.status}`
    );
  };
  return (
    <form onSubmit={handleSubmit}>
      <label>
        Amount
        <input name="amount" type="number" placeholder="5000" required />
      </label>
      <label>
        Currency
        <select name="currency">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </label>
      <label>
        Card number
        <CardNumberElement
          options={options}
          onReady={() => {
            console.log("CardNumberElement [ready]");
          }}
          onChange={(event) => {
            console.log("CardNumberElement [change]", event);
          }}
          onBlur={() => {
            console.log("CardNumberElement [blur]");
          }}
          onFocus={() => {
            console.log("CardNumberElement [focus]");
          }}
        />
      </label>
      <label>
        Expiration date
        <CardExpiryElement
          options={options}
          onReady={() => {
            console.log("CardNumberElement [ready]");
          }}
          onChange={(event) => {
            console.log("CardNumberElement [change]", event);
          }}
          onBlur={() => {
            console.log("CardNumberElement [blur]");
          }}
          onFocus={() => {
            console.log("CardNumberElement [focus]");
          }}
        />
      </label>
      <label>
        CVC
        <CardCvcElement
          options={options}
          onReady={() => {
            console.log("CardNumberElement [ready]");
          }}
          onChange={(event) => {
            console.log("CardNumberElement [change]", event);
          }}
          onBlur={() => {
            console.log("CardNumberElement [blur]");
          }}
          onFocus={() => {
            console.log("CardNumberElement [focus]");
          }}
        />
      </label>
      <button type="submit" disabled={!stripe || submitting}>
        Pay
      </button>
      <br />
      <br />
      <br />
      <br />
      <label>{message}</label>
      <br />
      <br />
      <label>
        Admin Operations
      <div className="buttonContainer">
      <button
        onClick={handleCharge}
        disabled={paymentStatus !== "requires_capture"}
      >
        charge
      </button>
      <button
        onClick={handleCancel}
        disabled={paymentStatus !== "requires_capture"}
      >
        cancel
      </button>
      <button onClick={handleRefund} disabled={paymentStatus !== "succeeded"}>
        refund
      </button>
      </div>
      </label>
    </form>
  );
};

export default SplitForm;
