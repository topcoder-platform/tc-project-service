import React from "react";
import ReactDOM from "react-dom";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { BrowserRouter } from "react-router-dom";

import ElementDemos from "./components/ElementDemos";
import SplitForm from "./components/demos/SplitForm";

import "./styles.css";

// set the public stripe key
const stripePromise = loadStripe("pk_test_rfcS49MHRVUKomQ9JgSH7Xqz", { apiVersion: "2020-08-27" });

const demos = [
  {
    path: "/split-card-elements",
    label: "Split Card Elements",
    component: SplitForm
  }
];

const App = () => {
  return (
    <BrowserRouter>
      <Elements stripe={stripePromise}>
        <ElementDemos demos={demos} />
      </Elements>
    </BrowserRouter>
  );
};

const rootElement = document.getElementById("root");

ReactDOM.render(<App />, rootElement);
