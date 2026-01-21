/**
 * Formatting Utilities
 *
 * This module provides common formatting functions for amounts, addresses, and dates.
 */

import { AMA_TOKEN_DECIMALS } from './constants'

/**
 * Format a number with locale-aware commas and specified decimal places
 *
 * @param num - The number to format
 * @param digits - Maximum fraction digits (default: 8)
 * @returns Formatted number string
 *
 * @example
 * ```ts
 * formatNumber(1234567.89) // "1,234,567.89"
 * formatNumber(1.123456789, 4) // "1.1235"
 * ```
 */
export function formatNumber(num: number, digits = 8): string {
	return num.toLocaleString(undefined, { maximumFractionDigits: digits })
}

/**
 * Format an amount with the AMA suffix
 *
 * @param amount - The amount to format
 * @returns Formatted string like "1,234.56 AMA"
 */
export function formatAMAAmount(amount: number): string {
	return `${formatNumber(amount)} AMA`
}

/**
 * Format a balance value with proper AMA token decimals
 *
 * @param amount - The balance amount (string, number, or undefined)
 * @returns Formatted balance string
 */
export function formatBalance(amount: string | number | undefined): string {
	if (amount === undefined) return '0'

	const num = Number(amount)
	if (!Number.isNaN(num)) {
		return num.toLocaleString(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: AMA_TOKEN_DECIMALS
		})
	}

	return String(amount)
}

/**
 * Format balance with privacy mode support
 *
 * @param amount - The balance amount
 * @param hideBalances - Whether to hide the balance
 * @returns Formatted balance or masked string
 */
export function formatBalanceWithPrivacy(
	amount: string | number | undefined,
	hideBalances: boolean
): string {
	if (hideBalances) return '******'
	return formatBalance(amount)
}

/**
 * Truncate an address for display (e.g., "abc123...xyz789")
 *
 * @param address - The full address
 * @param chars - Number of characters to show on each side (default: 6)
 * @returns Truncated address string
 *
 * @example
 * ```ts
 * formatShortAddress("abcdefghijklmnopqrstuvwxyz") // "abcdef...uvwxyz"
 * formatShortAddress("abcdefghijklmnopqrstuvwxyz", 4) // "abcd...wxyz"
 * ```
 */
export function formatShortAddress(address: string, chars = 6): string {
	if (!address || address.length <= chars * 2) return address || ''
	return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`
}
