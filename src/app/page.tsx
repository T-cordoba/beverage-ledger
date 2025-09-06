"use client";
import { useEffect, useState } from "react";
import type { Licor } from "./actions-licores";
import { createMovimiento } from "./actions";

async function fetchLicores(): Promise<Licor[]> {
	const res = await fetch("/api/licores", { cache: "no-store" });
	if (!res.ok) return [];
	return res.json();
}

export default function HomePage() {
	const [licores, setLicores] = useState<Licor[]>([]);
	const [cantidades, setCantidades] = useState<Record<string, { botellas: number; cajas: number }>>({});
	const [searchTerm, setSearchTerm] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchLicores().then(setLicores);
	}, []);

	const handleChange = (id: string, tipo: "botellas" | "cajas", delta: number) => {
		setCantidades((prev) => {
			const actual = prev[id] || { botellas: 0, cajas: 0 };
			const nuevo = {
				...actual,
				[tipo]: Math.max(0, actual[tipo] + delta),
			};
			return { ...prev, [id]: nuevo };
		});
	};

	const handleConfirmar = async () => {
		// Verificar que hay al menos un licor seleccionado
		const licoresSeleccionados = Object.entries(cantidades).filter(
			([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0
		);

		if (licoresSeleccionados.length === 0) {
			alert('Debes seleccionar al menos un licor para confirmar el movimiento.');
			return;
		}

		setSubmitting(true);
		try {
			// Preparar datos del movimiento
			const licoresData = licoresSeleccionados.flatMap(([id, cantidad]) => {
				const licor = licores.find(l => l.id.toString() === id);
				const items = [];
				
				// Agregar botellas si hay cantidad
				if (cantidad.botellas > 0) {
					items.push({
						nombre: licor?.nombre || '',
						tipo: licor?.tipo || '',
						cantidad: cantidad.botellas,
						unidad: 'botella' as const
					});
				}
				
				// Agregar cajas si hay cantidad
				if (cantidad.cajas > 0) {
					items.push({
						nombre: licor?.nombre || '',
						tipo: licor?.tipo || '',
						cantidad: cantidad.cajas,
						unidad: 'caja' as const
					});
				}
				
				return items;
			});

			// Crear el movimiento
			await createMovimiento({
				fecha: new Date().toISOString(),
				licores: licoresData
			});

			// Limpiar el formulario
			setCantidades({});
			setSearchTerm('');
			
			alert('Movimiento registrado exitosamente');
		} catch (error) {
			console.error('Error al crear movimiento:', error);
			alert('Error al registrar el movimiento. Por favor intenta de nuevo.');
		} finally {
			setSubmitting(false);
		}
	};

	// Filtrar licores por nombre y tipo
	const licoresFiltrados = licores.filter((licor) => {
		const searchLower = searchTerm.toLowerCase();
		return (
			licor.nombre.toLowerCase().includes(searchLower) ||
			licor.tipo.toLowerCase().includes(searchLower)
		);
	});

	// Ordenar licores: los que tienen cantidades seleccionadas primero
	const licoresOrdenados = [...licoresFiltrados].sort((a, b) => {
		const cantidadA = cantidades[a.id] || { botellas: 0, cajas: 0 };
		const cantidadB = cantidades[b.id] || { botellas: 0, cajas: 0 };
		
		const tieneSeleccionA = cantidadA.botellas > 0 || cantidadA.cajas > 0;
		const tieneSeleccionB = cantidadB.botellas > 0 || cantidadB.cajas > 0;
		
		// Si uno tiene selección y el otro no, el que tiene selección va primero
		if (tieneSeleccionA && !tieneSeleccionB) return -1;
		if (!tieneSeleccionA && tieneSeleccionB) return 1;
		
		// Si ambos tienen o no tienen selección, mantener orden alfabético por nombre
		return a.nombre.localeCompare(b.nombre);
	});

	return (
		<div className="min-h-screen bg-background text-primary">
			{/* Header */}
			<header className="border-b border-border bg-gradient-to-r from-background to-cardBg backdrop-blur-sm">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
					<div className="flex items-center gap-3 mb-3 lg:mb-4">
						<div className="w-2 h-2 lg:w-3 lg:h-3 bg-accent rounded-full"></div>
						<h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-accent tracking-wide">
							<span className="block sm:inline">Encore Beverage</span>
							<span className="block sm:inline sm:ml-2">Ledger</span>
						</h1>
					</div>
					<p className="text-secondary/80 text-sm sm:text-base lg:text-lg font-light ml-5 lg:ml-7">
						Gestión de inventario de licores para Encore Boston Harbor
					</p>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
				{/* Search Bar */}
				<div className="mb-6 lg:mb-8">
					<div className="relative max-w-full sm:max-w-md">
						<input
							type="text"
							placeholder="Buscar por nombre o tipo..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-cardBg border border-border rounded-xl sm:rounded-2xl text-primary placeholder-placeholder focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all text-sm sm:text-base"
						/>
						<div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
							{searchTerm ? (
								<button
									onClick={() => setSearchTerm("")}
									className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-accent/20 hover:bg-accent/40 flex items-center justify-center text-accent transition-colors"
									aria-label="Limpiar búsqueda"
								>
									×
								</button>
							) : (
								<div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-accent/40 rounded-full"></div>
							)}
						</div>
					</div>
					{searchTerm && (
						<div className="mt-2 text-xs sm:text-sm text-secondary/60">
							{licoresFiltrados.length} resultado{licoresFiltrados.length !== 1 ? 's' : ''} para "{searchTerm}"
						</div>
					)}
				</div>

				<section className="bg-cardBg/60 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-border/50 shadow-2xl">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 gap-2">
						<h2 className="text-xl sm:text-2xl font-light text-primary">Selecciona los licores</h2>
						<div className="text-xs sm:text-sm text-secondary/60 font-light">
							{licoresOrdenados.length} de {licores.length} productos {searchTerm ? 'encontrados' : 'disponibles'}
						</div>
					</div>
						<ul className="grid gap-4 sm:gap-6">
							{licoresOrdenados.length === 0 ? (
								<li className="text-secondary/60 text-center py-12 lg:py-16 text-base lg:text-lg font-light">
									{searchTerm ? `No se encontraron licores para "${searchTerm}"` : 'No hay licores registrados.'}
								</li>
							) : (
								licoresOrdenados.map((licor) => {
									const cantidad = cantidades[licor.id] || { botellas: 0, cajas: 0 };
									const hasSelection = cantidad.botellas > 0 || cantidad.cajas > 0;
									return (
										<li
											key={licor.id}
											className={`group relative bg-gradient-to-r from-background/80 to-cardBg backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border transition-all duration-300 hover:shadow-xl ${
												hasSelection 
													? 'border-accent/50 shadow-accent/10 shadow-lg' 
													: 'border-border/30 hover:border-accent/30'
											}`}
										>
											{hasSelection && (
												<div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-2 h-2 sm:w-3 sm:h-3 bg-accent rounded-full animate-pulse"></div>
											)}
											
											<div className="flex flex-col gap-4 sm:gap-6">
												{/* Licor Info */}
												<div className="flex-1">
													<h3 className="text-lg sm:text-xl lg:text-2xl font-light text-primary mb-2 group-hover:text-accent transition-colors">
														{licor.nombre}
													</h3>
													<div className="inline-flex items-center">
														<span className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium uppercase tracking-widest text-accent/80 bg-accent/10 rounded-full border border-accent/20 backdrop-blur-sm">
															{licor.tipo}
														</span>
													</div>
												</div>
												
												{/* Controls */}
												<div className="flex flex-col gap-3 sm:gap-4">
													{/* Botellas */}
													<div className="flex items-center justify-between sm:justify-start sm:gap-4 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-border/30">
														<label className="text-xs sm:text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]">
															Botellas
														</label>
														<div className="flex items-center gap-2 sm:gap-3">
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-border/50 hover:bg-accent/20 text-primary transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg border border-border/20 hover:border-accent/30"
																onClick={() => handleChange(licor.id, "botellas", -1)}
																aria-label="Restar botella"
																type="button"
															>
																−
															</button>
															<span className="w-8 sm:w-12 text-center font-light text-lg sm:text-xl text-accent">
																{cantidad.botellas}
															</span>
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent hover:bg-accentHover text-background transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg shadow-lg hover:shadow-xl"
																onClick={() => handleChange(licor.id, "botellas", 1)}
																aria-label="Sumar botella"
																type="button"
															>
																+
															</button>
														</div>
													</div>
													
													{/* Cajas */}
													<div className="flex items-center justify-between sm:justify-start sm:gap-4 bg-background/50 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-border/30">
														<label className="text-xs sm:text-sm font-light text-secondary/80 uppercase tracking-wider min-w-[60px] sm:min-w-[80px]">
															Cajas
														</label>
														<div className="flex items-center gap-2 sm:gap-3">
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-border/50 hover:bg-accent/20 text-primary transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg border border-border/20 hover:border-accent/30"
																onClick={() => handleChange(licor.id, "cajas", -1)}
																aria-label="Restar caja"
																type="button"
															>
																−
															</button>
															<span className="w-8 sm:w-12 text-center font-light text-lg sm:text-xl text-accent">
																{cantidad.cajas}
															</span>
															<button
																className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent hover:bg-accentHover text-background transition-all duration-200 flex items-center justify-center font-light text-base sm:text-lg shadow-lg hover:shadow-xl"
																onClick={() => handleChange(licor.id, "cajas", 1)}
																aria-label="Sumar caja"
																type="button"
															>
																+
															</button>
														</div>
													</div>
												</div>
											</div>
										</li>
									);
								})
							)}
						</ul>
						
						{/* Summary of Selected Items */}
						{Object.entries(cantidades).some(([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0) && (
							<div className="mt-6 lg:mt-8 p-4 sm:p-6 backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl">
								<h3 className="text-lg sm:text-xl font-light text-primary mb-4">Resumen de selección</h3>
								<div className="space-y-2">
									{Object.entries(cantidades)
										.filter(([_, cantidad]) => cantidad.botellas > 0 || cantidad.cajas > 0)
										.map(([id, cantidad]) => {
											const licor = licores.find(l => l.id.toString() === id);
											const items = [];
											if (cantidad.botellas > 0) items.push(`${cantidad.botellas} botella${cantidad.botellas > 1 ? 's' : ''}`);
											if (cantidad.cajas > 0) items.push(`${cantidad.cajas} caja${cantidad.cajas > 1 ? 's' : ''}`);
											
											return (
												<div key={id} className="flex justify-between text-sm sm:text-base">
													<span className="text-secondary font-light">{licor?.nombre}</span>
													<span className="text-accent font-medium">{items.join(' + ')}</span>
												</div>
											);
										})
									}
								</div>
							</div>
						)}
						
						{/* Floating Action Button */}
						<div className="mt-8 lg:mt-12 flex justify-center">
							<button 
								onClick={handleConfirmar}
								disabled={submitting}
								className="group flex items-center gap-3 sm:gap-4 bg-accent hover:bg-accentHover text-background px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base lg:text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
							>
								<span>{submitting ? 'Procesando...' : 'Confirmar Movimiento'}</span>
								<div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-background rounded-full group-hover:scale-125 transition-transform"></div>
							</button>
						</div>
					</section>
				</main>
			</div>
		);
	}