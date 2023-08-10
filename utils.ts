import { regURL } from '@/config/regexp'
import { usePermission } from '@/hooks/business'
import * as XLSX from 'xlsx'
import { useRoute } from 'vue-router'
/**
 * 获取url中的查询字符串参数
 * @param {String} url  url字符串
 */
export const getURLParams = (url: string) => {
	const search = url.split('?')[1]
	if (!search) {
		return {}
	}
	return JSON.parse(
		'{"' + decodeURIComponent(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}'
	)
}

/**
 *  延迟执行
 */
export const sleep = (interval: number) => new Promise(resolve => setTimeout(resolve, interval))

/**
 * 构造枚举字段管理对象
 */
interface EnumModel {
	id: string | number
	name: string | number
	color?: string
	status?: status
	[key: string]: any
	[key: number]: any
}

// TODO daotin: define enums typescript
interface Enums {
	[x: string]: string
}
export interface EnumResult<T extends EnumModel> {
	ids: Array<T['id']>
	names: Array<T['name']>
	origin: Array<T>
	enums: Enums
	[key: string]: any
	[key: number]: any
	getColor: (id: string) => string
	getStatus: (id: string) => status | undefined
	getNameById: (id: string | number) => string | number
	getNamesByIds: (ids: Array<string | number>) => Array<string | number>
	getFormats: (idAlias: string, nameAlias: string) => any[]
	getFilters: (hides: Array<string | number>) => T[]
}

export const enumMng = <T extends EnumModel>(data: Array<T>): EnumResult<T> => {
	const result: EnumResult<T> = {} as EnumResult<T>
	const ids: Array<string | number> = []
	const names: Array<string | number> = []
	const enums: Enums = {}

	data.forEach(item => {
		result[item.id] = item.name
		ids.push(item.id)
		names.push(item.name)
		enums[item.key || item.id] = item.id + ''
	})

	result.ids = ids
	result.names = names
	result.origin = data
	result.enums = enums
	result.getColor = id => {
		const row = data.find(item => item.id === id)
		return row ? row.color! : ''
	}
	result.getStatus = (id: string) => {
		const row = data.find(item => item.id === id)
		return row ? row.status : undefined
	}
	result.getNameById = id => {
		let name: string | number = ''
		const row = data.find(item => item.id === id)
		name = row ? row.name : ''
		return name
	}
	result.getNamesByIds = ids => {
		const names: Array<string | number> = []
		ids.forEach(id => {
			const row = data.find(item => item.id === id)
			row && names.push(row.name)
		})
		return names
	}
	result.getFormats = (idAlias, nameAlias) =>
		data.map(item => ({
			[idAlias]: item.id,
			[nameAlias]: item.name,
		}))
	result.getFilters = hides => data.filter(item => !hides.includes(item.id))

	return result
}

/**
 * 数值录入
 * @param {String} value     输入的值
 * @param {Boolean} minus      是否允许输入负数
 * @param {Number}  decimals   保留几位小数，不传参则不对小数进行处理，0表示整数。
 */
export const inputNumber = (value: string | number, minus: boolean = true, decimals?: number) => {
	if (!value) {
		return ''
	}
	let result = String(value)
	result = result.replace(/^(\-)*\D*(\d*(?:\.\d*)?).*$/g, '$1$2')
	// 正数处理，去除负号
	if (!minus) {
		result = result.replace('-', '')
	}
	// 小数处理
	const decimalIndex = result.indexOf('.')
	if (decimalIndex > -1 && decimals !== undefined) {
		if (decimals === 0) {
			result = result.slice(0, decimalIndex + decimals)
		} else if (decimals > 0) {
			result = result.slice(0, decimalIndex + decimals + 1)
		}
	}
	return result
}

/**
 * 随机生成十六进制颜色
 */
export const randomHexColor = () => '#' + ('00000' + ((Math.random() * 0x1000000) << 0).toString(16)).substr(-6)

/**
 * 获取树的所有节点的某个属性值
 */
export const getTreeNodeValue = (tree: any, filed: string) => {
	return tree
		.map((node: any) => {
			const result: any[] = []
			node[filed] && result.push(node[filed])
			if (node.children) {
				result.push(...getTreeNodeValue(node.children, filed))
			}
			return result
		})
		.flat()
}

/**
 * 去除空值
 */
export const removeEmptyField = (source: any) => {
	let result: any = {}
	if (typeof source === 'string') {
		source = JSON.parse(source)
	}
	if (source instanceof Array) {
		result = []
	}
	if (source instanceof Object) {
		for (const key in source) {
			// 属性值不为'',null,undefined才加入新对象里面(去掉'',null,undefined)
			if (source.hasOwnProperty(key) && source[key] !== '' && source[key] !== null && source[key] !== undefined) {
				if (source[key] instanceof Object) {
					// 空数组或空对象不加入新对象(去掉[],{})
					if (JSON.stringify(source[key]) === '{}' || JSON.stringify(source[key]) === '[]') {
						continue
					}
					// 属性值为对象,则递归执行去除方法
					result[key] = removeEmptyField(source[key])
				} else if (
					typeof source[key] === 'string' &&
					((source[key].indexOf('{') > -1 && source[key].indexOf('}') > -1) ||
						(source[key].indexOf('[') > -1 && source[key].indexOf(']') > -1))
				) {
					// 属性值为JSON时
					try {
						const value = JSON.parse(source[key])
						if (value instanceof Object) {
							result[key] = removeEmptyField(value)
						}
					} catch (e) {
						result[key] = source[key]
					}
				} else {
					result[key] = source[key]
				}
			}
		}
	}
	return result
}

/**
 * 判断字符串中是否存在3位以上的键盘序
 * 如zhangsan123，就存在键盘序，返回true
 */
export const keyBoardContinue = (source: string) => {
	const c1 = [
		['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
		['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '{', '}', '|'],
		['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ':', '"'],
		['z', 'x', 'c', 'v', 'b', 'n', 'm', '<', '>', '?'],
	]
	const c2 = [
		['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
		['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
		['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
		['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
	]
	const str = source.split('')

	const y: number[] = []
	const x: number[] = []
	for (let c = 0; c < str.length; c++) {
		y[c] = 0
		x[c] = -1
		for (let i = 0; i < c1.length; i++) {
			for (let j = 0; j < c1[i].length; j++) {
				if (str[c] == c1[i][j]) {
					y[c] = i
					x[c] = j
				}
			}
		}
		if (x[c] != -1) continue
		for (let i = 0; i < c2.length; i++) {
			for (let j = 0; j < c2[i].length; j++) {
				if (str[c] == c2[i][j]) {
					y[c] = i
					x[c] = j
				}
			}
		}
	}

	for (let c = 1; c < str.length - 1; c++) {
		if (y[c - 1] == y[c] && y[c] == y[c + 1]) {
			if ((x[c - 1] + 1 == x[c] && x[c] + 1 == x[c + 1]) || (x[c + 1] + 1 == x[c] && x[c] + 1 == x[c - 1])) {
				return true
			}
		} else if (x[c - 1] == x[c] && x[c] == x[c + 1]) {
			if ((y[c - 1] + 1 == y[c] && y[c] + 1 == y[c + 1]) || (y[c + 1] + 1 == y[c] && y[c] + 1 == y[c - 1])) {
				return true
			}
		}
	}
	return false
}

// 获取text中的内容
export const openTextFile = file => {
	const reader = new FileReader()
	return new Promise((resolve, reject) => {
		reader.onload = function () {
			if (reader.result) {
				return resolve(reader.result)
			} else {
				return reject('读取失败')
			}
		}
		reader.readAsText(file.raw)
	})
}

export const getOffset = elem => {
	function getLeft(o) {
		if (o == null) {
			return 0
		} else {
			return o.offsetLeft + getLeft(o.offsetParent) + (o.offsetParent ? o.offsetParent.clientLeft : 0)
		}
	}

	function getTop(o) {
		if (o == null) {
			return 0
		} else {
			return o.offsetTop + getTop(o.offsetParent) + (o.offsetParent ? o.offsetParent.clientTop : 0)
		}
	}
	return { left: getLeft(elem), top: getTop(elem) }
}

export const dataToFile = params => {
	let { fileName, data } = params
	// 无需考虑兼容IE问题
	var blobURL = window.URL.createObjectURL(new Blob([data])) // 将blob对象转为一个URL
	var tempLink = document.createElement('a') // 创建一个a标签
	tempLink.style.display = 'none'
	tempLink.href = blobURL
	tempLink.setAttribute('download', fileName) // 给a标签添加下载属性
	if (typeof tempLink.download === 'undefined') {
		tempLink.setAttribute('target', '_blank')
	}
	document.body.appendChild(tempLink) // 将a标签添加到body当中
	tempLink.click() // 启动下载
	document.body.removeChild(tempLink) // 下载完毕删除a标签
	window.URL.revokeObjectURL(blobURL)
}

export const guid = () => {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}
export const dedupe = array => {
	return Array.from(new Set(array))
}

export const isEmpty = val => {
	return val === '' || val === undefined || val === null
}

/**
 * 判断是否是图片
 * @param  {[string]} fileName [文件名称]
 * @return {[boolean]}         [返回值]
 */
export const isImage = fileName => {
	if (typeof fileName !== 'string') return false
	let name = fileName.toLowerCase()
	return (
		name.endsWith('.png') ||
		name.endsWith('.jpeg') ||
		name.endsWith('.jpg') ||
		name.endsWith('.gif') ||
		name.endsWith('.bmp')
	)
}

/**
 * 判断是否是某种类型
 * @param  {[string]} fileName [文件名称]
 * @return {[boolean]}         [返回值]
 */
export const isSetType = (fileName: string, type: string | Array<string>) => {
	if (typeof fileName !== 'string') return false
	let name = fileName.toLowerCase()
	if (Array.isArray(type)) {
		const isFilterArr = type.filter(item => {
			return name.endsWith(item)
		})
		return isFilterArr.length > 0
	} else {
		return name.endsWith(type)
	}
}

/**
 * 判断是否是一个url
 * @param str 字符串
 */
export const isUrl = (str: string) => new RegExp(regURL).test(str)

export function bigNumberTransform(value) {
	const newValue = ['', '', '']
	let fr = 1000
	let num = 3
	let text1 = ''
	let fm = 1
	while (value / fr >= 1) {
		fr *= 10
		num += 1
	}
	if (num <= 8) {
		// 万
		text1 = parseInt(num - 4 + '') / 3 > 1 ? '千万' : '万'
		fm = text1 === '万' ? 10000 : 10000000
		if (value % fm === 0) {
			newValue[0] = parseInt(value / fm + '') + ''
		} else {
			newValue[0] = parseFloat(value / fm + '').toFixed(2) + ''
		}
		newValue[1] = text1
	} else if (num <= 16) {
		// 亿
		text1 = (num - 8) / 3 > 1 ? '千亿' : '亿'
		text1 = (num - 8) / 4 > 1 ? '万亿' : text1
		text1 = (num - 8) / 7 > 1 ? '千万亿' : text1
		fm = 1
		if (text1 === '亿') {
			fm = 100000000
		} else if (text1 === '千亿') {
			fm = 100000000000
		} else if (text1 === '万亿') {
			fm = 1000000000000
		} else if (text1 === '千万亿') {
			fm = 1000000000000000
		}
		if (value % fm === 0) {
			newValue[0] = parseInt(value / fm + '') + ''
		} else {
			newValue[0] = parseFloat(value / fm + '').toFixed(2) + ''
		}
		newValue[1] = text1
	}
	if (value < 1000) {
		newValue[0] = value + ''
		newValue[1] = ''
	}
	return newValue.join('')
}

export const setAuth = (auth: string | string[], vif: boolean = true) => {
	const { checkPermission } = usePermission()
	if (checkPermission(auth) && vif) {
		return true
	}
	return false
}

/**
 * 将秒数转换成时长
 * @param second 秒
 * @returns 00:00:01 形式的时长
 */
export const getTimeLength = second => {
	let secondTime = parseInt(second) // 秒
	let minuteTime = 0 // 分
	let hourTime = 0 // 小时

	if (secondTime > 59) {
		minuteTime = parseInt(secondTime / 60 + '')
		secondTime = parseInt((secondTime % 60) + '')
		if (minuteTime > 59) {
			hourTime = parseInt(minuteTime / 60 + '')
			minuteTime = parseInt((minuteTime % 60) + '')
		}
	}

	// 小时不补0（用于持续时长）
	minuteTime = (minuteTime + '').padStart(2, '0')
	secondTime = (secondTime + '').padStart(2, '0')

	// if (hourTime < 10) {
	// 	hourTime = '0' + hourTime
	// }
	// if (minuteTime < 10) {
	// 	minuteTime = '0' + minuteTime
	// }
	// if (secondTime < 10) {
	// 	secondTime = '0' + secondTime
	// }

	return hourTime + ':' + minuteTime + ':' + secondTime
}

/**
 * 校验文件名称长度
 * @param file 文件
 * @param length 比较的长度
 * @returns 是否小于length长度，是则返回true，否则返回false
 */
export const checkFileNameLength = (file, length) => {
	// console.log('⭐checkFileNameLength==>', file.name.split('.')[0] <= length)
	return file.name.split('.')[0]?.length <= length
}

interface ITransNumber {
	num: string //转化后的数字.
	unit: string //转化后的单位，目前只处理展示为K和M
}
/**
 * 处理超大数字后返回值类型
 * @typedef {Object} ITransNumber
 * @property {string} num - 转化后的数字.
 * @property {string} unit - 转化后的单位，目前只处理展示为K和M
 */
/**
 * 将大数字转化为带单位的对象
 * @param { number } num - 需要转化的数字
 * @returns { INumberObj } tempObj 转化后的对象
 */
export const transBigNum = (num: number): ITransNumber => {
	let tempObj: ITransNumber = {
		num: num + '',
		unit: '',
	}
	if (num >= 1000) {
		if (num >= 1000000) {
			if (num >= 1000000000) {
				tempObj.num = (num / 1000 / 1000 / 1000).toFixed(2).replace(/\.?0+$/, '')
				tempObj.unit = 'B'
			} else {
				tempObj.num = (num / 1000 / 1000).toFixed(2).replace(/\.?0+$/, '')
				tempObj.unit = 'M'
			}
		} else {
			tempObj.num = (num / 1000).toFixed(2).replace(/\.?0+$/, '')
			tempObj.unit = 'K'
		}
	}
	return tempObj
}

/**
 * 将大数字转化为带单位的对象，
 * @param { number } num - 需要转化的数字
 * @returns { INumberObj } tempObj 转化后的对象
 */
export const transBigNumForCard = (num: number): ITransNumber => {
	let tempObj: ITransNumber = {
		num: num + '',
		unit: '',
	}
	if (num >= 10000) {
		if (num >= 1000000) {
			if (num >= 1000000000) {
				tempObj.num = (num / 1000 / 1000 / 1000).toFixed(2).replace(/\.?0+$/, '')
				tempObj.unit = 'B'
			} else {
				tempObj.num = (num / 1000 / 1000).toFixed(2).replace(/\.?0+$/, '')
				tempObj.unit = 'M'
			}
		} else {
			tempObj.num = (num / 1000).toFixed(2).replace(/\.?0+$/, '')
			tempObj.unit = 'K'
		}
	}
	return tempObj
}

/**
 * 处理超大数字后返回值类型
 * @typedef {Object} ITransTime
 * @property {string} num - 转化后的数字.
 * @property {string} unit - 转化后的单位，目前只处理展示为K和M
 */
interface ITransTime {
	hours: number
	min: number
}
/**
 * 将时间字符串转化为小时和分钟的对象
 * @param { string } dateStr 时间字符串或者时间对象，结构需要为hh:mm:ss
 * @param { boolead } needCeil 是否需要将秒向上取整
 * @returns { ITransTime } hours 小时 min 分钟
 */
export const transDate = (dateStr: string, needCeil: boolean = false): ITransTime => {
	let [hours, min, sec] = dateStr.split(':').map(item => Number(item))
	if (needCeil && Number(sec) > 0) {
		min = min + 1
	}
	return { hours, min }
}

/**
 * 对密码非键盘序进行校验
 * @param { string } password 输入的密码
 * @returns 返回值是否符合规则
 */
export const testKeyboardSequence = (password: string): boolean => {
	const lineOne = '~!@#$%^&*()_+'
	const lineTwo = '`1234567890-='
	const lineThree = 'QWERTYUIOP'
	const lineFour = 'ASDFGHJKL'
	const lineFive = 'ZXCVBNM'
	const backlineOne = '+_)(*&^%$#@!~'
	const backlineTwo = '=-0987654321`'
	const backlineThree = 'POIUYTREWQ'
	const backlineFour = 'LKJHGFDSA'
	const backlineFive = 'MNBVCXZ'
	for (let i = 0; i + 3 <= password.length; i++) {
		const localCheckStr = password.substring(i, i + 3)
		if (
			lineOne.includes(localCheckStr.toUpperCase()) ||
			lineTwo.includes(localCheckStr.toUpperCase()) ||
			lineThree.includes(localCheckStr.toUpperCase()) ||
			lineFour.includes(localCheckStr.toUpperCase()) ||
			lineFive.includes(localCheckStr.toUpperCase())
		) {
			return false
		}

		if (
			backlineOne.includes(localCheckStr.toUpperCase()) ||
			backlineTwo.includes(localCheckStr.toUpperCase()) ||
			backlineThree.includes(localCheckStr.toUpperCase()) ||
			backlineFour.includes(localCheckStr.toUpperCase()) ||
			backlineFive.includes(localCheckStr.toUpperCase())
		) {
			return false
		}
	}
	return true
}

type TLengCount = {
	passCheck: boolean
	length: number
}
const SHEET_HEADER_INDEX = [
	'A1',
	'B1',
	'C1',
	'D1',
	'E1',
	'F1',
	'G1',
	'H1',
	'I1',
	'J1',
	'K1',
	'L1',
	'M1',
	'N1',
	'O1',
	'P1',
	'Q1',
	'R1',
	'S1',
	'T1',
	'U1',
	'V1',
	'W1',
	'X1',
	'Y1',
	'Z1',
]
/**
 * 获取excel文件的行数，只适配单工作区，没有表头或只有单行表头
 * @param { Blob } uploadFile excel文件的blob
 * @param { boolean } hasHeader 是否有表头，默认为true
 * @param { boolean } checkHeader 是否检查表头 默认不校验false
 * @param { Array<string>} header 待校验表头的字符串/数字数组
 * @param { Array<string> } handerNameList 表头数组对应的单元格数组 默认从A1开始
 * @returns { boolean } passCheck 通过表头校验 不检查表头时设置为true
 * @returns { number } length excel文件去除表头后的行数
 */
export const getExcelLength = async (
	uploadFile: Blob,
	hasHeader: boolean = true,
	checkHeader: boolean = false,
	header: string[] = [''],
	handerNameList: string[] = SHEET_HEADER_INDEX
): Promise<TLengCount> => {
	try {
		let check: boolean = true
		const fileData = await uploadFile.arrayBuffer()
		const workbook = XLSX.read(fileData, {
			type: 'array',
		})
		const first_worksheet = workbook.Sheets[workbook.SheetNames[0]] // 拿第一个sheet的内容
		// 转成array
		const tempArr = XLSX.utils.sheet_to_json<Array<string | number>>(first_worksheet, {
			header: 1,
		})
		if (hasHeader && checkHeader) {
			// 如果需要校验表头
			header.map((item, index) => {
				const temp_cell = first_worksheet[handerNameList[index]]
				if (!temp_cell || temp_cell.v != item) {
					check = false
				}
			})
		}
		return {
			passCheck: check,
			length: hasHeader ? tempArr.length - 1 : tempArr.length,
		}
	} catch (err) {
		console.log(err)
		return Promise.reject(err)
	}
}

// 使用router.currentRoute获取路由中params参数对象
// 示例：路由为 /user/:id
// 当前路由为 /user/1
// 则获取到的对象为 { id: 1 }
export function getParamsObject(key?: string) {
	const route = useRoute()
	if (key) {
		return route.params[key]
	}
	return route.params
}

// 获取路由参数对象
// 示例：路由为 /user?id=1
// 则获取到的对象为 { id: 1 }
const getQueryObject = (url: string): { [key: string]: string } => {
	url = url == null ? window.location.href : url
	const search = url.substring(url.lastIndexOf('?') + 1)
	const obj: { [key: string]: string } = {}
	const reg = /([^?&=]+)=([^?&=]*)/g
	search.replace(reg, (rs, $1, $2) => {
		const name = decodeURIComponent($1)
		let val = decodeURIComponent($2)
		val = String(val)
		obj[name] = val
		return rs
	})
	return obj
}

/**
 * 构建通用criteria传参对象
 * @param {*} querys 搜索条件
 * 使用示例：
  const params = window.$getPageQuerys(
    [
      {
        type: "contains",
        key: "productName",
        value: this.formData.productName
      }
    ]
  );
 */
export const getCriteriaQuerys = (querys: any[] = []) => {
	const params = {}
	if (querys && querys.length > 0) {
		querys.forEach(item => {
			if (item.type === 'than') {
				if (Array.isArray(item.value) && item.value.length === 2) {
					const [start, end] = item.value
					params[item.key] = {
						greaterThanOrEqual: start || '',
						lessThanOrEqual: end || '',
					}
				}
			} else if (item.type === 'in') {
				if (Array.isArray(item.value) && item.value.length > 0) {
					params[item.key] = {
						in: item.value,
					}
				}
			} else if (!isEmpty(item.value)) {
				params[item.key] = {
					[item.type]: item.value,
				}
			}
		})
	}

	return params
}

type TFileSize = 'B' | 'KB' | 'MB' | 'GB' | 'TB'
/**
 * 转化文件大小字符串。未指定单位时，小于0.01的切换到下级单位。指定单位后，小于0.01时默认为0.01
 * @param {number} size 文件大小，默认为B
 * @param {TFileSize|null} tagUnit 期望输出大小的单位 'B' | 'KB' | 'MB' | 'GB' | 'TB'
 * @param {boolean} needUnit 是否输出单位。默认为true
 * @param {TFileSize} oriUnit 输入数字大小的单位 'B' | 'KB' | 'MB' | 'GB' | 'TB'
 * @return
 */
export const getFileSize = (
	size: number,
	tagUnit: TFileSize | null = null,
	needUnit: boolean = true,
	oriUnit: TFileSize = 'B'
): string => {
	const unitList = ['B', 'KB', 'MB', 'GB', 'TB']
	const tagIndex = unitList.findIndex(item => item == tagUnit)
	const oriIndex = unitList.findIndex(item => item == oriUnit)
	let resultIndex = 0
	let tempSize = size
	if (tagIndex == -1 || oriIndex == -1 || tagIndex == oriIndex) {
		// 单位填写错误或未填写，走正常逻辑
		while (tempSize > 1024) {
			tempSize = tempSize / 1024
			resultIndex++
		}
	} else {
		let time = Math.min(Math.abs(tagIndex - oriIndex), 5)
		while (time >= 1) {
			time--
			tempSize = Math.sign(tagIndex - oriIndex) == 1 ? tempSize / 1024 : tempSize * 1024
		}
		resultIndex = tagIndex
	}

	tempSize = Math.max(tempSize, 0.01)
	return tempSize.toFixed(2).replace(/\.?0+$/, '') + (needUnit ? unitList[resultIndex] : '')
}

// 转化事件单位 只处理到小时
type TTimeUnit = 'millisecond' | 'second' | 'minute' | 'hour'
export const transNumberTime = (
	time: number,
	tagUnit: TTimeUnit = 'hour',
	oriUnit: TTimeUnit = 'millisecond'
): number => {
	const unitList = ['millisecond', 'second', 'minute', 'hour']
	const tagIndex = unitList.findIndex(item => item == tagUnit)
	const oriIndex = unitList.findIndex(item => item == oriUnit)
	let tempSize = time
	if (tagIndex == -1 || oriIndex == -1 || isNaN(time)) {
		// 此处好像不用处理
		return time
	} else {
		let tempAbs = Math.min(Math.abs(tagIndex - oriIndex), 3)
		if (oriIndex == 0) {
			tempSize = tempSize / 1000
		}
		while (tempAbs > 1) {
			tempAbs--
			tempSize = Math.sign(tagIndex - oriIndex) == 1 ? tempSize / 60 : tempSize * 60
		}
		if (tagIndex == 0) {
			tempSize = tempSize * 1000
		}
		tempSize = Math.max(tempSize, 0.01)
		return Number(tempSize.toFixed(2).replace(/\.?0+$/, ''))
	}
}


// 导出所有模块
export 