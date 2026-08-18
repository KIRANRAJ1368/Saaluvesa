import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import "./ContactSection.css";
import useScrollAnimation from "../hooks/useScrollAnimation";
import { api } from "../lib/api";

const initialForm = { name: "", email: "", address: "", pincode: "", requirement: "" };
const initialErrors = { name: "", email: "", address: "", pincode: "", requirement: "" };

export default function ContactSection() {
  const location = useLocation();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState(initialErrors);
  const [touched, setTouched] = useState({});
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const animRef = useScrollAnimation();

  function validateField(name, value) {
    const trimmed = value.trim();

    if (name === "name") {
      if (!trimmed) {
        return "Name is required.";
      }
      if (/[0-9]/.test(value)) {
        return "Numbers are not allowed in the Name field.";
      }
      if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
        return "Name must contain letters only.";
      }
      if (trimmed.length < 3) {
        return "Name must be at least 3 characters long.";
      }
    }

    if (name === "email") {
      if (!trimmed) {
        return "Email address is required.";
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
        return "Please enter a valid email address (e.g., example@gmail.com).";
      }
    }

    if (name === "address") {
      if (!trimmed) {
        return "Address is required.";
      }
    }

    if (name === "pincode") {
      if (!trimmed) {
        return "Postal code is required.";
      }
    }

    if (name === "requirement") {
      if (!trimmed) {
        return "Requirement details are required.";
      }
      if (trimmed.length < 10) {
        return "Please enter at least 10 characters explaining your requirement.";
      }
    }

    return "";
  }

  function validateForm(currentForm) {
    const newErrors = {};
    let isValid = true;

    Object.keys(initialForm).forEach((key) => {
      const error = validateField(key, currentForm[key]);
      newErrors[key] = error;
      if (error) {
        isValid = false;
      }
    });

    return { isValid, newErrors };
  }

  function handleChange(e) {
    const { name, value } = e.target;
    let newValue = value;

    // Do not allow numbers in the Name field
    if (name === "name") {
      newValue = value.replace(/[0-9]/g, "");
    }

    setForm((f) => ({ ...f, [name]: newValue }));

    if (touched[name]) {
      const fieldError = validateField(name, newValue);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  }

  function handleKeyDown(e) {
    // Block keydown of digits 0-9 in Name field
    if (e.target.name === "name" && e.key >= "0" && e.key <= "9") {
      e.preventDefault();
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError("");

    // Mark all as touched on submit attempt
    const allTouched = Object.keys(initialForm).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    const { isValid, newErrors } = validateForm(form);
    setErrors(newErrors);

    if (!isValid) {
      return; // Block submission until all required fields pass validation
    }

    setIsSubmitting(true);
    try {
      const query = new URLSearchParams(location.search);
      await api("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          address: form.address,
          postal_code: form.pincode,
          requirement_details: form.requirement,
          product_id: query.get("product_id") || undefined,
          product_name: query.get("product_name") || undefined,
        }),
      });
      setSent(true);
    } catch (error) {
      setSubmitError(error.message || "We could not send your requirement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="contact" className="contact-section" ref={animRef}>
      <div className="wrap contact-section__grid">
        <div className="contact-section__info" data-animate="fade-left">
          <div className="eyebrow contact-section__eyebrow">Contact Us</div>
          <h2>Tell us what you need built.</h2>
          {/* <p>
            Submissions here are emailed straight to{" "}
            <a href="mailto:kiranraj1368@gmail.com">kiranraj1368@gmail.com</a>.
          </p> */}

          <div className="contact-section__block">
            <h3>Registered Office</h3>
            <p>
              Saaluvesa Enterprises Pvt Ltd
              <br />
              Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti,
              <br />
              Sathyamangalam, Erode, Tamil Nadu – 638459
            </p>
          </div>

          <div className="contact-section__block">
            <h3>Reach us directly</h3>
            <p>
              <a href="tel:+919488410884">+91 94884 10884</a>
              <br />
              <a href="mailto:contact@saaluvesa.com">contact@saaluvesa.com</a>
            </p>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit} noValidate data-animate="fade-right">
          {sent ? (
            <div className="contact-form__success">
              <div className="contact-form__success-glow" aria-hidden="true" />
              <div className="contact-form__success-icon">
                <svg viewBox="0 0 52 52" aria-hidden="true">
                  <circle cx="26" cy="26" r="25" fill="none" />
                  <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
              <h3>Message Sent Successfully</h3>
              <p>Thank you for reaching out to Saaluvesa! Your enquiry has been received and is being processed.</p>
              <button
                type="button"
                className="btn btn--mint contact-form__submit"
                onClick={() => { setSent(false); setForm(initialForm); setErrors(initialErrors); setTouched({}); }}
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <>
              <div className="contact-form__row">
                <label className={errors.name && touched.name ? "form-group--error" : ""}>
                  Name
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="Your full name"
                    aria-invalid={!!errors.name}
                    className={errors.name && touched.name ? "input--error" : ""}
                  />
                  {touched.name && errors.name && <span className="field-error">{errors.name}</span>}
                </label>

                <label className={errors.email && touched.email ? "form-group--error" : ""}>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="example@gmail.com"
                    aria-invalid={!!errors.email}
                    className={errors.email && touched.email ? "input--error" : ""}
                  />
                  {touched.email && errors.email && <span className="field-error">{errors.email}</span>}
                </label>
              </div>

              <div className="contact-form__row">
                <label className={`contact-form__grow ${errors.address && touched.address ? "form-group--error" : ""}`}>
                  Address
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Street, city, state"
                    aria-invalid={!!errors.address}
                    className={errors.address && touched.address ? "input--error" : ""}
                  />
                  {touched.address && errors.address && <span className="field-error">{errors.address}</span>}
                </label>

                <label className={errors.pincode && touched.pincode ? "form-group--error" : ""}>
                  Postal Code
                  <input
                    type="text"
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="638459"
                    aria-invalid={!!errors.pincode}
                    className={errors.pincode && touched.pincode ? "input--error" : ""}
                  />
                  {touched.pincode && errors.pincode && <span className="field-error">{errors.pincode}</span>}
                </label>
              </div>
              <label className={errors.requirement && touched.requirement ? "form-group--error" : ""}>
                Requirement Details
                <textarea
                  name="requirement"
                  rows={4}
                  value={form.requirement}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Product, quantity, print method, timeline…"
                  aria-invalid={!!errors.requirement}
                  className={errors.requirement && touched.requirement ? "input--error" : ""}
                />
                {touched.requirement && errors.requirement && <span className="field-error">{errors.requirement}</span>}
              </label>

              <button type="submit" className="btn btn--mint contact-form__submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send Requirement"}
              </button>
              {submitError && <p className="field-error">{submitError}</p>}
            </>
          )}
        </form>
      </div>
    </section>
  );
}
